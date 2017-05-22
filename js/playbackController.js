import { Observable } from "rxjs/Observable";
import { songLengthInSeconds } from "./song";

import { values, pick, sum, mapValues } from "lodash";

import { playCommands$ as midiPlayCommands$ } from "./midi";
import { playCommands$ as keyboardPlayCommands$ } from "./keyboard";
import {
  startLivePlaybackEngine,
  startScriptedPlayback
} from "./AudioPlaybackEngine";
import { combine as combinePlayCommands } from "./playCommands";

import { animationFrame } from "rxjs/scheduler/animationFrame";
import audioContext from "./audioContext";

import { songs, timestampToBeats, songLengthInBeats } from "./song";

import { displayNameForUid } from "./database";

export default function playbackController(
  params,
  actions,
  currentUser$,
  media,
  firebase,
  subscription
) {
  const authorName$ = media.song$.switchMap(song => {
    if (song) {
      return displayNameForUid(firebase.database(), song.uid);
    } else {
      return Observable.empty();
    }
  });

  const parentView$ = playbackControllerHelper(
    actions,
    currentUser$,
    media.song$.map(o => (o ? o.notes : [])),
    media.song$.map(o => (o ? o.bpm : 120)).distinctUntilChanged(),
    media,
    subscription
  );

  const songId$ = media.song$.map(o => (o ? o.songId : null));

  return Observable.combineLatest(
    parentView$,
    authorName$,
    songId$,
    (parentView, authorName, songId) => ({ ...parentView, authorName, songId })
  );
}

export function playbackControllerHelper(
  actions,
  currentUser$,
  notes$,
  bpm$,
  media,
  subscription
) {
  const livePlayCommands$ = combinePlayCommands(
    Observable.merge(
      actions.playCommands$$,
      Observable.of(midiPlayCommands$, keyboardPlayCommands$)
    )
  );

  const songLength$ = Observable.combineLatest(notes$, bpm$, (notes, bpm) =>
    songLengthInSeconds(notes, bpm)
  );

  let startPosition$;
  if (actions.changePlaybackStartPosition$) {
    startPosition$ = actions.changePlaybackStartPosition$.startWith(null);
  } else {
    startPosition$ = Observable.of(0);
  }

  const scriptedPlaybackContext$$ = actions.play$
    .withLatestFrom(startPosition$, bpm$, (action, startPosition, bpm) =>
      startScriptedPlayback(
        notes$,
        bpm,
        startPosition || 0,
        media.audioBuffers$,
        actions.pause$.concatWith({})
      )
    )
    .publish();

  const scriptedPlayCommands$$ = scriptedPlaybackContext$$.map(
    context => context.playCommands$
  );

  const isPlaying$ = scriptedPlayCommands$$
    .switchMap(stream =>
      Observable.concat(
        Observable.of(true),
        stream.ignoreElements(),
        Observable.of(false)
      )
    )
    .startWith(false);

  const playbackPositionInSeconds$ = scriptedPlayCommands$$
    .switchMap(stream =>
      Observable.interval(1000)
        .map(i => i + 1)
        .startWith(0)
        .takeUntil(stream.ignoreElements().concatWith(1))
        .concatWith(0)
    )
    .startWith(0);

  const playbackPositionInBeats$$ = scriptedPlaybackContext$$.map(context =>
    Observable.of(context.playbackStartedAt, animationFrame)
      .repeat()
      .map(playbackStartedAt =>
        timestampToBeats(
          audioContext.currentTime - playbackStartedAt,
          context.bpm
        )
      )
      .filter(beat => beat >= 0)
      .takeUntil(context.playCommands$.ignoreElements().concatWith(1))
      .concatWith(0)
      .map(beat => beat + context.startPosition)
  );

  // TODO: Do we need to keep refcounts when merging these streams?
  const playCommands$ = Observable.merge(
    scriptedPlayCommands$$.concatAll(),
    startLivePlaybackEngine(
      media.audioBuffers$,
      livePlayCommands$,
      subscription
    )
  );

  // Start up Observables with side-effect
  subscription.add(scriptedPlaybackContext$$.connect());

  return Observable.combineLatest(
    media.videoClips$,
    media.loading$,
    isPlaying$,
    playbackPositionInSeconds$,
    currentUser$,
    startPosition$,
    songLength$,
    notes$,
    bpm$,
    media.song$,
    (
      videoClips,
      loading,
      isPlaying,
      playbackPositionInSeconds,
      currentUser,
      playbackStartPosition,
      songLength,
      notes,
      bpm,
      song
    ) => ({
      videoClips,
      isPlaying,
      playbackPositionInSeconds,
      playbackPositionInBeats$$,
      playbackStartPosition,
      loading,
      currentUser,
      playCommands$,
      songLength,
      notes,
      songTitle: song ? song.title : null,
      bpm
    })
  );
}
