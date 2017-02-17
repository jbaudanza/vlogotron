import {Subject} from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';

import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/mapTo';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/publish';

import {times, sample} from 'lodash';

import encodeWavSync from './encodeWavSync';


// TODO: This is duplicated in VideoClipStore
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export function startRecording(note, stop$) {
  const countdownSubject = new Subject();
  const durationSubject = new Subject();

  const mediaStreamPromise = navigator.mediaDevices.getUserMedia({
    audio: true, video: true
  });

  // TODO: Handle the case where getUserMedia is rejected

  const mediaPromise = mediaStreamPromise
      .then((mediaStream) => startCountdown(note, countdownSubject).then(() => mediaStream))
      .then((mediaStream) => startCapturing(mediaStream, stop$, durationSubject));

  // The clipId only needs to be unique per each user
  const clipId = createRandomString(6);

  return {
    countdown$: countdownSubject.asObservable(),
    duration$: durationSubject.asObservable(),
    stream: mediaStreamPromise,
    media: mediaPromise,
    clipId: clipId
  };
}

function startCountdown(note, countObserver) {
  const stopTone = startTone(note);

  const thisCountdown = countdown$.share();
  thisCountdown.subscribe(countObserver);

  return countdown$.toPromise().then(stopTone);
}

function startCapturing(mediaStream, stop$, durationObserver) {
  const videoRecorder = new MediaRecorder(mediaStream);
  videoRecorder.start();

  stop$.take(1).subscribe(() => {
    videoRecorder.stop();
    mediaStream.getTracks().forEach((t) => t.stop());
  });

  const audioBufferPromise = takeAudioBufferFromMediaStream(
    mediaStream, stop$
  );

  const streams = mediaRecorderStreams(videoRecorder);

  return Promise.all([streams.blob, audioBufferPromise]);
}

// const frequencies = {
//   "A":  440,
//   "A#": 466.16,
//   "B":  493.88,
//   "C":  523.25,
//   "C#": 554.37,
//   "D":  587.33,
//   "D#": 622.25,
//   "E":  659.25,
//   "F":  698.46,
//   "F#": 739.99,
//   "G":  783.99,
//   "G#": 830.6
// };

// Lower octave
const frequencies = {
  // "A":  220.00,
  // "A#": 233.08,
  // "B":  246.94,
  "C":  261.63,
  "C#": 277.18,
  "D":  293.66,
  "D#": 311.13,
  "E":  329.63,
  "F":  349.23,
  "F#": 369.99,
  "G":  392.00,
  "G#": 415.30,
  "A":  440,
  "A#": 466.16,
  "B":  493.88
};


function startTone(note) {
  const ramp = 0.1;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + ramp);
  gainNode.connect(audioContext.destination);

  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequencies[note];
  oscillator.connect(gainNode);
  oscillator.start();

  return function() {
    const stopTime = audioContext.currentTime + ramp;
    gainNode.gain.linearRampToValueAtTime(0, stopTime);
    oscillator.stop(stopTime);
  }
}

const countdownSeconds = 5;
const countdown$ = Observable.interval(1000)
  .take(countdownSeconds)
  .map(x => countdownSeconds - x - 1)
  .filter(x => x > 0) // Leave out the last 0 value
  .startWith(countdownSeconds);


function combineBlobs(list) {
  if (list.length > 0) {
    return new Blob(list, {type: list[0].type})
  } else {
    return new Blob(); // empty
  }
}

function mediaRecorderStreams(mediaRecorder) {
  const stopEvent$ = Observable.fromEvent(mediaRecorder, 'stop');
  
  const dataEvents$ = Observable.fromEvent(mediaRecorder, 'dataavailable')
      .takeUntil(stopEvent$);

  const progress$ = dataEvents$.map(e => e.timeStamp);

  const blob = dataEvents$
      .map(e => e.data)
      .toArray()
      .map(combineBlobs)
      .toPromise()

  return {progress$, blob};
}

function buffersFromAudioProcessEvent(event) {
  const list = [];
  for (let i=0; i<event.inputBuffer.numberOfChannels; i++) {
    list.push(
      new Float32Array(event.inputBuffer.getChannelData(i))
    );
  }
  return list;
}

// TODO: duplicated in VideoClipStore
function decodeAudioData(arraybuffer) {
  // Safari doesn't support the Promise syntax for decodeAudioData, so we need
  // to make the promise ourselves.
  return new Promise(audioContext.decodeAudioData.bind(audioContext, arraybuffer));
}

function takeAudioBufferFromMediaStream(mediaStream, takeUntil$) {
  const blockSize = 16384;
  const audioSource = audioContext.createMediaStreamSource(mediaStream);

  const recorderNode = audioContext.createScriptProcessor(
    blockSize,                // buffer size
    audioSource.channelCount, // input channels
    audioSource.channelCount  // output channels
  );

  audioSource.connect(recorderNode);

  // NOTE: We are not really directing any audio to this destination, however,
  // the audioprocess event doesn't seem to fire unless it's hooked up.
  recorderNode.connect(audioContext.destination);

  const audioProcessEvent$ = Observable.fromEvent(recorderNode, 'audioprocess');

  return audioProcessEvent$
      .takeUntil(takeUntil$)
      .map(buffersFromAudioProcessEvent)
      .toArray()
      .map((batches) => encodeWavSync(batches, audioContext.sampleRate))
      .toPromise()
      .then(decodeAudioData);
}

function createRandomString(length) {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
  return times(length, () => sample(chars)).join('');
}