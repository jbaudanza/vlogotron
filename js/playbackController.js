import {Observable} from 'rxjs/Observable';
import {songLengthInSeconds} from './song';

import {values, pick, sum, mapValues} from 'lodash';

import {playCommands$ as midiPlayCommands$} from './midi';
import {playCommands$ as keyboardPlayCommands$} from './keyboard';
import {startLivePlaybackEngine, startScriptedPlayback} from './AudioPlaybackEngine';
import {combine as combinePlayCommands} from './playCommands';
import {videoClipsForUid, loadAudioBuffersFromVideoClips} from './mediaLoading';

import {animationFrame} from 'rxjs/scheduler/animationFrame';
import audioContext from './audioContext';


import {songs, timestampToBeats, songLengthInBeats} from './song';

export default function playbackController(params, actions, currentUser$, subscription) {
  const videoClips$ = videoClipsForUid(params.uid)
      .publish();

  subscription.add(videoClips$.connect());

  const livePlayCommands$ = combinePlayCommands(
    Observable.merge(
      actions.playCommands$$,
      Observable.of(midiPlayCommands$, keyboardPlayCommands$)
    )
  );

  // Looks like { [note]: [audioBuffer], ... }
  const {audioBuffers$, loading$} = loadAudioBuffersFromVideoClips(videoClips$, subscription);

  const song = songs['mary-had-a-little-lamb'];
  const bpm = 120;
  const songLength = songLengthInSeconds(song, bpm);

  const scriptedPlaybackContext$$ = actions.play$
    .map((action) => (
      startScriptedPlayback(
        song,
        bpm,
        0, // Start position
        audioBuffers$,
        actions.pause$
      )
    )).publish();

  const scriptedPlayCommands$$ = scriptedPlaybackContext$$.map(context => context.playCommands$)

  const isPlaying$ = scriptedPlayCommands$$
    .switchMap((stream) => (
      Observable.concat(
        Observable.of(true),
        stream.ignoreElements(),
        Observable.of(false)
      )
    )).startWith(false);

  const playbackPositionInSeconds$ = scriptedPlayCommands$$.switchMap((stream) => (
    Observable
      .interval(1000).map(i => i + 1)
      .startWith(0)
      .takeUntil(stream.ignoreElements())
      .concat(Observable.of(0))
  )).startWith(0);

  const playbackPositionInBeats$ = scriptedPlaybackContext$$.switchMap((context) => (
    Observable
      .of(context.playbackStartedAt, animationFrame)
      .repeat()
      .map((playbackStartedAt) => timestampToBeats(audioContext.currentTime - playbackStartedAt, bpm))
      .filter(beat => beat >= 0)
      .takeWhile(beat => beat < songLengthInBeats(song))
      .takeUntil(context.playCommands$.ignoreElements())
      //.map(beat => beat + startPosition) // TODO: Make this work
  ));

  // TODO: Do we need to keep refcounts when merging these streams?
  const playCommands$ = Observable.merge(
    scriptedPlayCommands$$.concatAll(),
    startLivePlaybackEngine(audioBuffers$, livePlayCommands$, subscription)
  )

  // Start up Observables with side-effect
  subscription.add(scriptedPlaybackContext$$.connect());

  return Observable.combineLatest(
    videoClips$.startWith({}), loading$, isPlaying$, playbackPositionInSeconds$, currentUser$,
    (videoClips, loading, isPlaying, playbackPositionInSeconds, currentUser) => ({
      videoClips,
      isPlaying,
      playbackPositionInSeconds,
      playbackPositionInBeats$,
      loading,
      currentUser,
      playCommands$,
      songLength,
      songTitle: 'Mary had a little lamb',
      authorName: 'Jonathan Baudanza'
    })
  );
}

