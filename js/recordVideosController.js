/* @flow */

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import type { Subscription } from "rxjs/Subscription";

import audioContext from "./audioContext";
import { start as startCapturing } from "./recording";

import { playbackControllerHelper } from "./playbackController";

import { displayNameForUid } from "./database";

import { updatesForNewSong } from "./localWorkspace";
import { createVideoClip } from "./database";
import {
  frequencyToNote,
  noteToFrequency,
  noteLabelsToMidi
} from "./frequencies";

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
  props$: Observable<Object>,
  actions: { [string]: Observable<any> },
  currentUser$: Observable<?Object>,
  mediaStore: Object,
  firebase: Object,
  subscription: Subscription
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

  const nonNullUser$: Observable<Object> = currentUser$.nonNull();

  const uploadedEvents$ = finalMedia$
    .withLatestFrom(nonNullUser$, (media, currentUser) =>
      createVideoClip(
        firebase.database(),
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

  const clearedEvents$ = actions.clearVideoClip$.map((note: string) => ({
    action: "remove-video",
    note
  }));

  subscription.add(
    mediaStore.workspace$.subscribe(storage$ => {
      updatesForNewSong(
        Observable.merge(clearedEvents$, uploadedEvents$, actions.editSong$),
        storage$,
        subscription
      );
    })
  );

  const clearedMedia$ = actions.clearVideoClip$.map((note: string) => ({
    note,
    cleared: true
  }));

  subscription.add(
    clearedMedia$.subscribe(e => mediaStore.clearedEvents$.next(e))
  );
  subscription.add(
    finalMedia$.subscribe(e => mediaStore.recordedMedia$.next(e))
  );

  const parentView$ = playbackControllerHelper(
    actions,
    currentUser$,
    mediaStore.song$.map(o => (o ? o.notes : [])),
    mediaStore.song$.map(o => (o ? o.bpm : 120)).distinctUntilChanged(),
    mediaStore,
    subscription
  );

  const authorName$ = mediaStore.song$.switchMap(song => {
    if (song) {
      if ("uid" in song)
        return displayNameForUid(firebase.database(), song.uid);
      else return nonNullUser$.map(u => u.displayName);
    } else {
      return Observable.empty();
    }
  });

  // $FlowFixMe - We don't have type definitions for combineLatest with this many arguments
  return Observable.combineLatest(
    parentView$,
    mediaStore.videoClips$,
    recordingState$,
    mediaStore.song$,
    mediaStore.loading$,
    mediaStore.audioSources$,
    authorName$,
    props$,
    (
      parentView,
      videoClips,
      recordingState,
      song,
      loading,
      audioSources,
      authorName,
      props
    ) => ({
      ...parentView,
      ...recordingState,
      videoClips,
      song,
      loading,
      supported: "MediaRecorder" in window,
      songTitle: song ? song.title : null,
      audioSources,
      authorName,
      location: props.location,
      onNavigate: props.onNavigate,
      onLogin: props.onLogin
    })
  );
}

function getUserMedia() {
  if (navigator.mediaDevices) {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });
  } else {
    // The View logic should stop this error from ever been raised
    return Promise.reject("Recording isn't suppported on this device.");
  }
}

function startRecording(note, finish$, abort$) {
  return Observable.fromPromise(getUserMedia())
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

    const targetMidiNote = normalizeOctave(noteLabelsToMidi[note]);
    const lowerBound = targetMidiNote - 1;
    const upperBound = targetMidiNote + 1;

    const pitchCorrection$ = result.pitch$.map(
      pitch =>
        (pitch != null
          ? noteToRange(
              normalizeOctave(frequencyToNote(pitch)),
              lowerBound,
              upperBound
            )
          : null)
    );

    const viewState$ = Observable.combineLatest(
      result.duration$,
      pitchCorrection$.startWith(null),
      (duration, pitchCorrection) => ({
        durationRecorded: duration,
        pitchCorrection
      })
    );

    return Observable.merge(
      viewState$.map(viewState => ({ viewState })),
      media$.map(media => ({ media }))
    ).subscribe(observer);
  });

  // Add a 100ms pause to allow the tone to ramp down
  const pause$ = Observable.timer(110).take(1).ignoreElements();

  const processes$ = Observable.concat(
    countdownWithTone$,
    pause$,
    startCapturing$
  )
    .takeUntil(abort$)
    .publishReplay();

  const viewState$ = processes$
    .filter(obj => "viewState" in obj)
    // $FlowFixMe - Flow can't refine from filter op
    .map(obj => ({ mediaStream, noteBeingRecorded: note, ...obj.viewState }))
    .concatWith({});

  // $FlowFixMe - Need type definition for media$
  const media$ = processes$.filter(o => o.media).map(o => o.media);

  // The observable should cleanup itself when stop$ or abort$ fire
  // TODO: We might need to handle the case where the user navigates away while recording.
  processes$.connect();

  return { viewState$, media$ };
}

function startTone(note) {
  const ramp = 0.1;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + ramp);
  gainNode.connect(audioContext.destination);

  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = noteToFrequency(noteLabelsToMidi[note]);
  oscillator.connect(gainNode);
  oscillator.start();

  return function() {
    const stopTime = audioContext.currentTime + ramp;
    gainNode.gain.linearRampToValueAtTime(0, stopTime);
    oscillator.stop(stopTime);
  };
}

function normalizeOctave(midiNote) {
  return midiNote % 12;
}

function noteToRange(note, lowerBound, upperBound) {
  if (note < lowerBound) {
    return 0;
  }

  if (note > upperBound) {
    return 1;
  }

  return (note - lowerBound) / (upperBound - lowerBound);
}

const countdownSeconds = 5;
const countdown$ = Observable.interval(1000)
  .take(countdownSeconds)
  .map(x => countdownSeconds - x - 1)
  .filter(x => x > 0) // Leave out the last 0 value
  .startWith(countdownSeconds);
