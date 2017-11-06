/* @flow */

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject"
import * as firebase from "firebase";

import { values, pick, sum, mapValues, identity } from "lodash";

import { playCommands$ as midiPlayCommands$ } from "./midi";
import { playCommands$ as keyboardPlayCommands$ } from "./keyboard";
import {
  startLivePlaybackEngine,
  startScriptedPlayback,
  renderNotesToAudioBuffer
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

import encodeWavSync from "./encodeWavSync";

import { displayNameForUid, songForSongBoard } from "./database";
import combineTemplate from "./combineTemplate";

import type { Subscription } from "rxjs/Subscription";
import type { ScheduledNoteList } from "./song";
import type { Media, NoteConfiguration } from "./mediaLoading";

export default function playbackController(
  props$: Observable<Object>,
  actions: Object,
  media: Media,
  subscription: Subscription
) {
  const currentUser$: Observable<?Firebase$User> = props$.map(
    props => props.currentUser
  );

  const authorName$ = media.songBoard$.switchMap(songBoard => {
    return displayNameForUid(firebase.database(), songBoard.uid);
  });

  const song$ = media.songBoard$.map(songForSongBoard);

  actions.remix$.withLatestFrom(media.songBoard$, props$).subscribe(([
    ignore,
    songBoard,
    props
  ]) => {
    props.onCreateSongBoard(songBoard);
  });

  const parentView$ = playbackControllerHelper(
    actions,
    song$.map(o => o.notes),
    song$.map(o => o.bpm).distinctUntilChanged(),
    media,
    subscription
  );

  return Observable.combineLatest(
    parentView$,
    authorName$,
    props$,
    (parentView, authorName, props) => ({
      ...parentView,
      authorName,
      location: props.location,
      origin: props.origin
    })
  );
}

export type PlaybackViewProps = {
  noteConfiguration: NoteConfiguration,
  loading: { [string]: boolean },
  isPlaying: boolean,
  playbackPositionInSeconds: number,
  playbackStartPosition: number,
  songLength: number,
  songTitle: string,
  notes: ScheduledNoteList,
  bpm: number,
  playCommands$: Observable<Object>,
  playbackPositionInBeats$$: Observable<Observable<number>>
};

export function playbackControllerHelper(
  actions: Object,
  notes$: Observable<ScheduledNoteList>,
  bpm$: Observable<number>,
  media: Media,
  subscription: Subscription
): Observable<PlaybackViewProps> {
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

  // TODO: This will envolve into a worker process for rendering audio files
  // window.render$ = new Subject();
  // window.render$.withLatestFrom(
  //     bpm$,
  //     notes$,
  //     media.audioSources$,
  //     (ignore, bpm, notes, audioSources) => renderNotesToAudioBuffer(bpm, notes, audioSources)
  // )
  // .switch()
  // .map((audioBuffer: AudioBuffer) => {
  //   const arrayBuffer = encodeWavSync([
  //     [
  //     audioBuffer.getChannelData(0),
  //     audioBuffer.getChannelData(1),
  //     ]
  //   ], audioBuffer.sampleRate
  //   );

  //   return URL.createObjectURL(new Blob([arrayBuffer], { type: "audio/wav" }))
  // })
  // .debug('url').subscribe();

  const scriptedPlaybackContext$$ = actions.play$
    .withLatestFrom(startPosition$, bpm$, (action, startPosition, bpm) => {
      const playbackContext = startScriptedPlayback(
        notes$,
        bpm,
        startPosition || 0,
        media.audioSources$,
        actions.pause$.concatWith({}),
        audioContext.destination
      );

      return playbackContext;
    })
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
  const songTitle$ = media.songBoard$.map(songBoard => songBoard.title);

  const viewState$ = combineTemplate({
    noteConfiguration: media.noteConfiguration$,
    loading: media.loading$,
    isPlaying: isPlaying$,
    playbackPositionInSeconds: playbackPositionInSeconds$,
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
