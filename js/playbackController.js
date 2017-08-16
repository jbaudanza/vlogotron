/* @flow */

import { Observable } from "rxjs/Observable";

import { values, pick, sum, mapValues, identity } from "lodash";

import { playCommands$ as midiPlayCommands$ } from "./midi";
import { playCommands$ as keyboardPlayCommands$ } from "./keyboard";
import {
  startLivePlaybackEngine,
  startScriptedPlayback
} from "./AudioPlaybackEngine";
import { combine as combinePlayCommands } from "./playCommands";

import { animationFrame } from "rxjs/scheduler/animationFrame";
import audioContext from "./audioContext";

import {
  songLengthInSeconds,
  songs,
  timestampToBeats,
  songLengthInBeats
} from "./song";

import { displayNameForUid } from "./database";
import combineTemplate from "./combineTemplate";

import type { FirebaseDatabase } from "./database";
import type { Subscription } from "rxjs/Subscription";
import type { ScheduledNoteList } from "./song";
import type { Media } from "./mediaLoading";

export default function playbackController(
  props$: Observable<Object>,
  actions: Object,
  currentUser$: Observable<?Object>,
  media: Media,
  firebase: FirebaseDatabase,
  subscription: Subscription,
  navigate: Function
) {
  const authorName$ = media.songBoard$.switchMap(songBoard => {
    return displayNameForUid(firebase.database(), songBoard.uid);
  });

  const song$ = media.songBoard$.map(songBoard => songs[songBoard.songId]);

  const parentView$ = playbackControllerHelper(
    actions,
    currentUser$,
    song$.map(o => o.notes),
    song$.map(o => o.bpm).distinctUntilChanged(),
    media,
    subscription
  );

  return Observable.combineLatest(
    parentView$,
    authorName$,
    props$.map(props => props.shareUrl),
    (parentView, authorName, shareUrl) => ({
      ...parentView,
      authorName,
      shareUrl
    })
  );
}

export function playbackControllerHelper(
  actions: Object,
  currentUser$: Observable<?Object>,
  notes$: Observable<ScheduledNoteList>,
  bpm$: Observable<number>,
  media: Media,
  subscription: Subscription
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
        media.audioSources$,
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
      media.audioSources$,
      livePlayCommands$,
      subscription
    )
  );

  // Start up Observables with side-effect
  subscription.add(scriptedPlaybackContext$$.connect());

  const song$ = media.songBoard$.map(songBoard => songs[songBoard.songId]);
  const songTitle$ = song$.map(song => song.title);

  const viewState$ = combineTemplate({
    videoClips: media.videoClips$,
    loading: media.loading$,
    isPlaying: isPlaying$,
    playbackPositionInSeconds: playbackPositionInSeconds$,
    currentUser: currentUser$,
    playbackStartPosition: startPosition$,
    songLength: songLength$,
    songTitle: songTitle$,
    notes: notes$,
    bpm: bpm$
  });

  return viewState$.map(viewState => ({
    ...viewState,
    playCommands$,
    playbackPositionInBeats$$
  }));
}
