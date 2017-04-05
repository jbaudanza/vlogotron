import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';

import {times, sample} from 'lodash';

import encodeWavSync from './encodeWavSync';
import audioContext from './audioContext';

const messages = require('messageformat-loader!json-loader!./messages.json');

const initialState = {
  loading: false,
  playCommands$: Observable.never(),
  isPlaying: false,
  songTitle: messages['default-song-title']()
};


/**
  TODO
    - ESC key should abort
    - durationRecorded should increment every second, not every event callback
    - Get Playback to work
    - Should be able to clear videos
    - Should upload to server
 */

export default function recordVideosController(params, actions) {

  const recordingState$ =
    Observable.merge(
      actions.startRecording$.switchMap((note) => (
        startRecording(note, actions.stopRecording$)
      )),

      actions.dismissError$.mapTo({})
    );

  const stateWithVideoClipStore$ = recordingState$.
    scan(reduceToRecordingViewState, {videoClips: {}});

  return stateWithVideoClipStore$.map(obj => Object.assign({}, obj, initialState))
}

function reduceToRecordingViewState(acc, recorderState) {
  if (recorderState.finalMedia) {
    const videoClips = reduceToLocalVideoClipStore(
        acc.videoClips, recorderState.finalMedia
    );
    return {videoClips};
  } else {
    return Object.assign({videoClips: acc.videoClips}, recorderState)
  }
}

function reduceToLocalVideoClipStore(acc, obj) {
  return Object.assign({}, acc, {[obj.note]: {
    clipId: obj.clipId,
    sources: [{
      src: URL.createObjectURL(obj.videoBlob),
      type: obj.videoBlob.type
    }]}}
  );
}


function startRecording(note, stop$) {
  const promise = navigator.mediaDevices.getUserMedia({
    audio: true, video: true
  });

  return Observable
    .fromPromise(promise)
    .switchMap((mediaStream) => {
      return startRecording2(mediaStream, note, stop$)
    })
    .catch((err) => {
      // TODO: Is there some cross-platform way we can inspect this error to
      // make sure it's a permissions error and not something else?
      // Or, can we at least catch this error higher up in the observable chain,
      // just after the getUserMedia promise?
      return Observable.of(Object.assign(
        {error: messages["user-media-access-error"]()},
        initialState)
      )
    })
}

// TODO: better name
function startRecording2(mediaStream, note, stop$) {
  // The clipId only needs to be unique per each user
  const clipId = createRandomString(6);

  const countdownWithTone$ = Observable.create((observer) => {
    const stopTone = startTone(note);
    return countdown$
        .do({complete: stopTone})
        .map(countdown => ({countdownUntilRecord: countdown}))
        .subscribe(observer);
  });

  const startCapturing$ = Observable.create((observer) => {
    // TODO: This should take a $stop and $cancel observable
    const result = startCapturing(mediaStream, stop$);

    return result.duration$
      .map(d => ({durationRecorded: d}))
      .concat(result.media.then(([videoBlob, audioBuffer]) => ({
        finalMedia: {note, clipId, videoBlob}
      })))
      .subscribe(observer)
  });

  return Observable.concat(
    countdownWithTone$,
    startCapturing$,
  ).map((state) => (
    Object.assign(
      {mediaStream, noteBeingRecorded: note},
      state
    )
  ));
}

function startCapturing(mediaStream, stop$) {
  const videoRecorder = new MediaRecorder(mediaStream);
  videoRecorder.start();

  stop$.take(1).subscribe(() => {
    videoRecorder.stop();
    mediaStream.getTracks().forEach((t) => t.stop());
  });

  const result = takeAudioBufferFromMediaStream(
    mediaStream, stop$
  );

  const streams = mediaRecorderStreams(videoRecorder);

  return {
    duration$: result.duration$,
    media: Promise.all([streams.blob, result.audioBuffer])
  };
}


// Based off of http://www.phy.mtu.edu/~suits/notefreqs.html
// TODO: Add the rest, or use the formula described on that page
const frequencies = {
  "C3":  130.81,
  "C#3": 138.59,
  "D3":  146.83,
  "D#3": 155.56,
  "E3":  164.81,
  "F3":  174.61,
  "F#3": 185.00,
  "G3":  196.00,
  "G#3": 207.65,
  "A3":  220.00,
  "A#3": 233.08,
  "B3":  246.94,
  "C4":  261.63,
  "C#4": 277.18,
  "D4":  293.66,
  "D#4": 311.13,
  "E4":  329.63,
  "F4":  349.23,
  "F#4": 369.99,
  "G4":  392.00,
  "G#4": 415.30,
  "A4":  440.00,
  "A#4": 466.16,
  "B4":  493.88,
  "C5":  523.25,
  "C#5": 554.37,
  "D5":  587.33,
  "D#5": 622.25,
  "E5":  659.25,
  "F5":  698.46,
  "F#5": 739.99,
  "G5":  783.99,
  "G#5": 830.60
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

  const audioProcessEvent$ = Observable
      .fromEvent(recorderNode, 'audioprocess')
      .takeUntil(takeUntil$);

  const duration$ = audioProcessEvent$
      .map(event => event.inputBuffer.length)
      .scan((i,j) => i + j, 0)
      .map(x => x/audioContext.sampleRate);

  const audioBuffer = audioProcessEvent$
      .map(buffersFromAudioProcessEvent)
      .toArray()
      .map((batches) => encodeWavSync(batches, audioContext.sampleRate))
      .toPromise()
      .then(decodeAudioData);

  return {duration$, audioBuffer};
}

function createRandomString(length) {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
  return times(length, () => sample(chars)).join('');
}
