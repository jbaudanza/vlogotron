import {Subject} from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';

import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/mapTo';
import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/publish';

import {times, sample} from 'lodash';


// TODO: This is duplicated in VideoClipStore
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export default class RecordingStore {
  constructor(actions$) {
    const countdownSubject$ = new Subject();

    const recordActions$ = actions$.filter(a => a.type === 'record');

    const stopActions$ = actions$.filter(a => a.type === 'stop');

    // TODO: Make sure that a user rejecting a getUserMedia request doesn't stop
    // future request
    const mediaStream$ = recordActions$.switchMap(getUserMedia).publish();

    // This connect() is necesary because subscribing to this stream creates
    // the side-effect of a getUserMedia call
    // TODO: I think this needs to be unsubscribed somewhere, i guess all this shit does..
    mediaStream$.connect();

    // TODO: These should maybe be combined somehow
    this.mediaStream$ = Observable.merge(
      mediaStream$.map(o => o.stream),
      stopActions$.mapTo(null)
    )
    this.activeNote$ = Observable.merge(
      recordActions$.map(a => a.note),
      stopActions$.mapTo(null)
    )

    this.addedClips$ = new Subject();

    this.countdown$ = countdownSubject$.asObservable();

    mediaStream$
      .subscribe((action) => {
        const stopTone = startTone(action.note);

        countdown$.subscribe(
          // next
          (x) => countdownSubject$.next(x),
          // error
          null,
          // complete
          () => {
            countdownSubject$.next(null);
            stopTone();

            const recorder = new MediaRecorder(action.stream);
            recorder.start();

            stopActions$.take(1).subscribe(() => {
              recorder.stop();
              const tracks = action.stream.getTracks();
              tracks.forEach((t) => t.stop());
            });

            const streams = mediaRecorderStreams(recorder);

            streams.blob$.subscribe((blob) => {
              // The clipId only needs to be unique per each user
              const clipId = createRandomString(6);

              this.addedClips$.next({
                note: action.note,
                clipId: clipId,
                blob: blob
              })
            })
          }
        )
      });
  }
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

function getUserMedia(action) {
  return navigator.mediaDevices
      .getUserMedia({audio: true, video: true})
      .then((stream) => ({
        note: action.note,
        stream: stream
      }));
}

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

  const blob$ = dataEvents$
      .map(e => e.data)
      .toArray()
      .map(combineBlobs);

  return {progress$, blob$};
}

function createRandomString(length) {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
  return times(length, () => sample(chars)).join('');
}
