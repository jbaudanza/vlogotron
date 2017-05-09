import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { omit } from "lodash";

import audioContext from "./audioContext";
import { combine as combinePlayCommands } from "./playCommands";
import { start as startCapturing } from "./recording";

import { startLivePlaybackEngine } from "./AudioPlaybackEngine";

import { playCommands$ as midiPlayCommands$ } from "./midi";
import { playCommands$ as keyboardPlayCommands$ } from "./keyboard";

import { updatesForNewSong } from "./localWorkspace";
import { createVideoClip } from "./database";

// Note: keypress doesn't work for escape key. Need to use keydown.
const escapeKey$ = Observable.fromEvent(document, "keydown").filter(
  e => e.keyCode === 27
);

/**
  TODO
    - handle case where the user navigates while recording. 
    - durationRecorded should increment every second, not every event callback
 */

export default function recordVideosController(
  params,
  actions,
  currentUser$,
  mediaStore,
  subscription
) {
  const recordingEngine$ = actions.startRecording$
    .switchMap(note => startRecording(note, actions.stopRecording$, escapeKey$))
    .publish();

  subscription.add(recordingEngine$.connect());

  const recordingState$ = Observable.merge(
    recordingEngine$.switchMap(o => o.viewState$),
    actions.dismissError$.mapTo({})
  ).startWith({});

  const finalMedia$ = recordingEngine$.switchMap(o => o.media$);

  const uploadedEvents$ = finalMedia$
    .withLatestFrom(currentUser$, (media, currentUser) =>
      createVideoClip(
        {
          uid: currentUser.uid,
          note: media.note,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        },
        media.videoBlob
      ).then(videoClipId => ({
        action: "add-video",
        videoClipId: videoClipId,
        note: media.note
      }))
    )
    .mergeAll();

  const clearedEvents$ = actions.clearVideoClip$.map(note => ({
    action: "remove-video",
    note
  }));

  updatesForNewSong(
    Observable.merge(clearedEvents$, uploadedEvents$, actions.editSong$),
    subscription
  );

  const clearedMedia$ = actions.clearVideoClip$.map(note => ({
    note,
    cleared: true
  }));

  const localAudioBuffers$ = Observable.merge(finalMedia$, clearedMedia$)
    .scan(reduceToAudioBufferStore, {})
    .startWith({});

  const livePlayCommands$ = combinePlayCommands(
    Observable.merge(
      actions.playCommands$$,
      Observable.of(midiPlayCommands$, keyboardPlayCommands$)
    )
  );

  const localVideoStore$ = Observable.merge(finalMedia$, clearedMedia$)
    .scan(reduceToLocalVideoClipStore, {})
    .startWith({});

  const videoClips$ = Observable.combineLatest(
    localVideoStore$,
    mediaStore.videoClips$,
    (local, remote) => ({ ...remote, ...local })
  );

  // Looks like { [note]: [audioBuffer], ... }
  const audioBuffers$ = Observable.combineLatest(
    localAudioBuffers$,
    mediaStore.audioBuffers$,
    (local, remote) => ({ ...remote, ...local })
  );

  const playCommands$ = startLivePlaybackEngine(
    audioBuffers$,
    livePlayCommands$,
    subscription
  );

  return Observable.combineLatest(
    videoClips$.startWith({}),
    recordingState$,
    currentUser$,
    mediaStore.song$,
    mediaStore.loading$,
    (videoClips, recordingState, currentUser, song, loading) => ({
      ...recordingState,
      playCommands$,
      currentUser,
      videoClips,
      song,
      loading,
      songTitle: song ? song.title : null
    })
  );
}

function reduceToAudioBufferStore(acc, finalMedia) {
  if (finalMedia.cleared) {
    return omit(acc, finalMedia.note);
  } else {
    return {
      ...acc,
      [finalMedia.note]: finalMedia.audioBuffer
    };
  }
}

function reduceToLocalVideoClipStore(acc, obj) {
  if (obj.cleared) {
    return omit(acc, obj.note);
  } else {
    return {
      ...acc,
      [obj.note]: {
        sources: [
          {
            src: URL.createObjectURL(obj.videoBlob),
            type: obj.videoBlob.type
          }
        ]
      }
    };
  }
}

function startRecording(note, finish$, abort$) {
  const promise = navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  });

  return Observable.fromPromise(promise)
    .map(mediaStream => runRecordingProcess(mediaStream, note, finish$, abort$))
    .catch(err => {
      console.error(err);

      // TODO: Is there some cross-platform way we can inspect this error to
      // make sure it's a permissions error and not something else?
      // Or, can we at least catch this error higher up in the observable chain,
      // just after the getUserMedia promise?
      return Observable.of({
        viewState$: Observable.of({
          error: "user-media-access-error"
        }),
        media$: Observable.never()
      });
    });
}

// Manages the process of starting a countdown, playing a tone, and capturing
// audio and video data
function runRecordingProcess(mediaStream, note, finish$, abort$) {
  const finishOrAbort$ = Observable.merge(finish$, abort$).take(1);

  // TODO: I really wish this was closer to where the MediaStream is opened
  function cleanup() {
    mediaStream.getTracks().forEach(t => t.stop());
  }

  finishOrAbort$.subscribe({ complete: cleanup });

  // model the tone side-effect as an observable
  const countdownWithTone$ = Observable.create(observer => {
    return countdown$
      .map(countdown => ({ viewState: { countdownUntilRecord: countdown } }))
      .subscribe(observer)
      .add(startTone(note));
  });

  const startCapturing$ = Observable.create(observer => {
    const result = startCapturing(mediaStream, finish$, abort$);

    const media$ = Observable.combineLatest(
      result.audioBuffer$,
      result.videoBlob$,
      (audioBuffer, videoBlob) => ({ note, videoBlob, audioBuffer })
    );

    return Observable.merge(
      result.duration$.map(d => ({ viewState: { durationRecorded: d } })),
      media$.map(media => ({ media }))
    ).subscribe(observer);
  });

  const processes$ = Observable.concat(countdownWithTone$, startCapturing$)
    .takeUntil(abort$)
    .publishReplay();

  const viewState$ = processes$
    .filter(obj => "viewState" in obj)
    .map(obj => ({ mediaStream, noteBeingRecorded: note, ...obj.viewState }))
    .concatWith({});

  const media$ = processes$.filter(o => o.media).map(o => o.media);

  // The observable should cleanup itself when stop$ or abort$ fire
  // TODO: We might need to handle the case where the user navigates away while recording.
  processes$.connect();

  return { viewState$, media$ };
}

// Based off of http://www.phy.mtu.edu/~suits/notefreqs.html
// TODO: Add the rest, or use the formula described on that page
const frequencies = {
  C3: 130.81,
  "C#3": 138.59,
  D3: 146.83,
  "D#3": 155.56,
  E3: 164.81,
  F3: 174.61,
  "F#3": 185.00,
  G3: 196.00,
  "G#3": 207.65,
  A3: 220.00,
  "A#3": 233.08,
  B3: 246.94,
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.00,
  "G#4": 415.30,
  A4: 440.00,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.60
};

function startTone(note) {
  const ramp = 0.1;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + ramp);
  gainNode.connect(audioContext.destination);

  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = frequencies[note];
  oscillator.connect(gainNode);
  oscillator.start();

  return function() {
    const stopTime = audioContext.currentTime + ramp;
    gainNode.gain.linearRampToValueAtTime(0, stopTime);
    oscillator.stop(stopTime);
  };
}

const countdownSeconds = 5;
const countdown$ = Observable.interval(1000)
  .take(countdownSeconds)
  .map(x => countdownSeconds - x - 1)
  .filter(x => x > 0) // Leave out the last 0 value
  .startWith(countdownSeconds);
