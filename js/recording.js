/* @flow */

import { Observable } from "rxjs/Observable";

import audioContext from "./audioContext";
import encodeWavSync from "./encodeWavSync";
import asyncDetectPitch from "./asyncDetectPitch";

function mapAudioEventToPitch(event) {
  const array = event.inputBuffer.getChannelData(0);

  // This defaults to 0. Setting it to something higher will cause background
  // noise to return null.
  const threshold = 0.25;

  return asyncDetectPitch(array, threshold).then(result => {
    if (result === 0) {
      return null;
    } else {
      return audioContext.sampleRate / result;
    }
  });
}

export function start(
  mediaStream: MediaStream,
  finish$: Observable<any>,
  abort$: Observable<any>
) {
  const takeUntil$ = Observable.merge(finish$, abort$).take(1);

  //
  // Setup Video Recording
  //
  const videoRecorder = new MediaRecorder(mediaStream);
  videoRecorder.start();

  takeUntil$.subscribe({
    complete() {
      videoRecorder.stop();
    }
  });

  const videoBlob$ = Observable.race(
    videoBlobFromMediaRecorder(videoRecorder),
    abort$.ignoreElements()
  );

  //
  // Setup Audio Recording
  //
  const audioProcessEvent$ = audioProcessEventsFromNode(
    audioContext.createMediaStreamSource(mediaStream)
  ).takeUntil(takeUntil$);

  const duration$ = audioProcessEvent$
    .map(event => event.inputBuffer.length)
    .scan((i, j) => i + j, 0)
    .map(x => x / audioContext.sampleRate);

  const pitch$ = audioProcessEvent$.switchMap(mapAudioEventToPitch);

  const finishedAudioBuffer$ = audioProcessEventsToWavFile(
    audioProcessEvent$
  ).flatMap(decodeAudioData);

  const audioBuffer$ = Observable.race(
    finishedAudioBuffer$,
    abort$.ignoreElements()
  );

  return { duration$, audioBuffer$, videoBlob$, pitch$ };
}

export function audioProcessEventsToWavFile(
  audioProcessEvents$: Observable<AudioProcessingEvent>
): Observable<ArrayBuffer> {
  return audioProcessEvents$
    .map(buffersFromAudioProcessEvent)
    .toArray()
    .map(batches => encodeWavSync(batches, audioContext.sampleRate));
}

function combineBlobs(list) {
  if (list.length > 0) {
    return new Blob(list, { type: list[0].type });
  } else {
    return new Blob(); // empty
  }
}

function videoBlobFromMediaRecorder(mediaRecorder) {
  const stopEvent$ = Observable.fromEvent(mediaRecorder, "stop");

  const dataEvents$ = Observable.fromEvent(
    mediaRecorder,
    "dataavailable"
  ).takeUntil(stopEvent$);

  // We're currently using the audiostream to track progress, but we could
  // use this too.
  //const progress$ = dataEvents$.map(e => e.timeStamp);

  return dataEvents$.map(e => e.data).toArray().map(combineBlobs);
}

function buffersFromAudioProcessEvent(
  event: AudioProcessingEvent
): Array<Float32Array> {
  const list = [];
  for (let i = 0; i < event.inputBuffer.numberOfChannels; i++) {
    list.push(new Float32Array(event.inputBuffer.getChannelData(i)));
  }
  return list;
}

function decodeAudioData(arraybuffer) {
  // Safari doesn't support the Promise syntax for decodeAudioData, so we need
  // to make the promise ourselves.
  return new Promise(
    audioContext.decodeAudioData.bind(audioContext, arraybuffer)
  );
}

export function audioProcessEventsFromNode(
  audioSource: AudioNode
): Observable<AudioProcessingEvent> {
  const blockSize = 16384;

  const recorderNode = audioSource.context.createScriptProcessor(
    blockSize, // buffer size
    audioSource.channelCount, // input channels
    audioSource.channelCount // output channels
  );

  audioSource.connect(recorderNode);

  // NOTE: We are not really directing any audio to this destination, however,
  // the audioprocess event doesn't seem to fire unless it's hooked up.
  recorderNode.connect(audioSource.context.destination);

  return Observable.fromEvent(recorderNode, "audioprocess");
}
