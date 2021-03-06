/* @flow */

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import type { Subscription } from "rxjs/Subscription";
import * as firebase from "firebase";

import audioContext from "./audioContext";
import { start as startCapturing } from "./recording";
import { labelToMidiNote } from "./midi";

import { mapValues } from "lodash";

import { playbackControllerHelper } from "./playbackController";

import {
  displayNameForUid,
  photoURLForUid,
  updateSongBoard,
  createVideoClip,
  songForSongBoard
} from "./database";
import type { SongBoardEvent } from "./database";
import { songs } from "./song";

import { frequencyToNote, noteToFrequency } from "./frequencies";

import type { Media, CapturedMedia, VideoClipSources } from "./mediaLoading";
import type { PlaybackParams } from "./AudioPlaybackEngine";

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
  mediaStore: Media,
  subscription: Subscription
) {
  const recordingEngine$ = actions.startRecording$
    .switchMap(note => startRecording(note, actions.stopRecording$, escapeKey$))
    .publish();

  subscription.add(recordingEngine$.connect());

  const currentUser$: Observable<?Firebase$User> = props$.map(
    props => props.currentUser
  );

  const recordingState$ = Observable.merge(
    recordingEngine$.switchMap(o => o.viewState$),
    actions.dismissError$.mapTo({})
  ).startWith({});

  const finalMedia$ = recordingEngine$.switchMap(o => o.media$);

  const nonNullUser$: Observable<Firebase$User> = currentUser$.nonNull();
  const jwt$: Observable<?string> = currentUser$.switchMap(user => {
    if (user) return user.getToken();
    else return Observable.of(null);
  });
  const currentUid$: Observable<?string> = currentUser$.map(
    user => (user ? user.uid : null)
  );

  const songBoardId$ = mediaStore.songBoard$.map(
    songBoard => songBoard.songBoardId
  );

  const uploadedEvents$: Observable<
    SongBoardEvent
  > = finalMedia$
    .withLatestFrom(
      jwt$,
      currentUid$,
      songBoardId$,
      (media, jwt, uid, songBoardId): Promise<SongBoardEvent> =>
        createVideoClip(
          jwt,
          { note: media.note, sessionId: getSessionId(), songBoardId },
          media.videoBlob
        ).then(videoClipId =>
          makeUpdateVideoClipEvent(videoClipId, media.note, uid)
        )
    )
    .mergeAll();

  const clearedEvents$ = actions.clearVideoClip$.withLatestFrom(
    nonNullUser$,
    (note: number, user: Firebase$User) => ({
      type: "remove-video",
      note: note,
      uid: user.uid
    })
  );

  const songBoardEdits$: Observable<SongBoardEvent> = actions.editSong$;

  const songBoardEvents$: Observable<SongBoardEvent> = Observable.merge(
    clearedEvents$,
    uploadedEvents$,
    songBoardEdits$
  );

  subscription.add(
    songBoardEvents$.withLatestFrom(songBoardId$).subscribe(([
      event,
      songBoardId
    ]) => {
      updateSongBoard(firebase.database(), songBoardId, event);
    })
  );

  const clearedMedia$ = actions.clearVideoClip$.map((note: number) => ({
    note,
    cleared: true
  }));

  subscription.add(
    clearedMedia$.subscribe(e => mediaStore.clearedEvents$.next(e))
  );
  subscription.add(
    finalMedia$.subscribe(e => mediaStore.recordedMedia$.next(e))
  );

  const song$ = mediaStore.songBoard$.map(songForSongBoard);

  const parentView$ = playbackControllerHelper(
    actions,
    song$.map(o => o.notes),
    song$.map(o => o.bpm).distinctUntilChanged(),
    mediaStore,
    subscription
  );

  const authorName$ = mediaStore.songBoard$.switchMap(songBoard => {
    if ("uid" in songBoard)
      return displayNameForUid(firebase.database(), songBoard.uid);
    else return nonNullUser$.map(u => u.displayName);
  });

  const authorPhotoURL$ = mediaStore.songBoard$.switchMap(songBoard => {
    return photoURLForUid(firebase.database(), songBoard.uid);
  });

  // $FlowFixMe - We don't have type definitions for combineLatest with this many arguments
  return Observable.combineLatest(
    parentView$,
    mediaStore.noteConfiguration$,
    recordingState$,
    song$,
    mediaStore.loading$,
    mediaStore.audioSources$,
    authorName$,
    authorPhotoURL$,
    songBoardId$,
    props$,
    (
      parentView,
      noteConfiguration,
      recordingState,
      song,
      loading,
      audioSources,
      authorName,
      authorPhotoURL,
      songBoardId,
      props
    ) => ({
      ...parentView,
      ...recordingState,
      noteConfiguration,
      song,
      loading,
      supported: "MediaRecorder" in window,
      collaborateMode: props.location.pathname.endsWith("/collab"),
      audioBuffers: mapValues(audioSources, o => o.audioBuffer),
      authorName,
      authorPhotoURL,
      location: props.location,
      origin: props.origin,
      onNavigate: props.onNavigate,
      onLogin: props.onLogin,
      premiumAccountStatus: props.premiumAccountStatus,
      currentUser: props.currentUser,
      songBoardId
    })
  );
}

function makeUpdateVideoClipEvent(
  videoClipId: string,
  note: number,
  uid: ?string
): SongBoardEvent {
  if (uid) {
    return {
      type: "update-video-clip",
      videoClipId,
      note,
      uid
    };
  } else {
    return { type: "update-video-clip", videoClipId, note };
  }
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

function startRecording(note: number, finish$, abort$) {
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
function runRecordingProcess(mediaStream, note: number, finish$, abort$) {
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

    const media$: Observable<
      CapturedMedia
    > = Observable.combineLatest(
      result.audioBuffer$,
      result.videoBlob$,
      (audioBuffer, videoBlob) => ({ note, videoBlob, audioBuffer })
    );

    const targetMidiNote = normalizeOctave(note);
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

function startTone(note: number) {
  const ramp = 0.1;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + ramp);
  gainNode.connect(audioContext.destination);

  const oscillator = audioContext.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.value = noteToFrequency(note);
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

function getSessionId(): string {
  if (typeof localStorage["sessionId"] === "string") {
    return localStorage["sessionId"];
  } else {
    const newId = generateId();
    localStorage["sessionId"] = newId;
    return newId;
  }
}

function dec2hex(dec: number): string {
  return ("0" + dec.toString(16)).substr(-2);
}

function generateId(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join("");
}
