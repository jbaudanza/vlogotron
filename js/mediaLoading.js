/* @flow */
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";
import { Subject } from "rxjs/Subject";

import * as firebase from "firebase";

import audioContext from "./audioContext";

import { getArrayBuffer } from "./xhr";

import type { Route } from "./router";

import { findSongBoard, waitForTranscode } from "./database";
import type { SongBoard, VideoClip, VideoClipId } from "./database";
import type { AudioSourceMap, PlaybackParams } from "./AudioPlaybackEngine";

import {
  clone,
  omit,
  forEach,
  values,
  pick,
  pickBy,
  map,
  mapValues,
  merge,
  identity
} from "lodash";

type VideoClipSource = {
  src: string,
  type: string
};

export type VideoClipSources = {
  posterUrl: string,
  audioUrl: string,
  videoUrls: Array<VideoClipSource>
};

export type NoteConfiguration = {
  [string]: {
    sources: VideoClipSources,
    playbackParams: PlaybackParams
  }
};

// Maps notes to videoClipIds and VideoClipSources
type VideoClipIdMap = { [string]: string };
type VideoClipMap = { [string]: VideoClipSources };

import promiseFromTemplate from "./promiseFromTemplate";

const initialSong = {
  videoClips: {},
  notes: [],
  bpm: 120
};

export type CapturedMedia = {
  note: string,
  videoBlob: Blob,
  audioBuffer: AudioBuffer
};

export type ClearedMedia = {
  note: string,
  cleared: true
};

export type Media = {
  songBoard$: Observable<SongBoard>,
  noteConfiguration$: Observable<NoteConfiguration>,
  audioSources$: Observable<AudioSourceMap>,
  clearedEvents$: Subject<ClearedMedia>,
  recordedMedia$: Subject<CapturedMedia>,
  loading$: Observable<Object>
};

export function subscribeToSongBoardId(
  songBoardId: string,
  defaultSongTitle: string,
  subscription: Subscription
): Media {
  const clearedEvents$ = new Subject();
  const recordedMedia$ = new Subject();

  subscription.add(clearedEvents$);
  subscription.add(recordedMedia$);

  const emptyObject$ = Observable.of({});

  const songBoard$ = findSongBoard(
    firebase.database(),
    songBoardId
  ).publishReplay();

  const localAudioBuffers$ = Observable.merge(recordedMedia$, clearedEvents$)
    .scan(reduceToLocalAudioBufferStore, {})
    .startWith({})
    .publishReplay();

  const localVideoStore$ = Observable.merge(recordedMedia$, clearedEvents$)
    .scan(reduceToLocalVideoClipStore, {})
    .startWith({})
    .publishReplay();

  subscription.add(localAudioBuffers$.connect());
  subscription.add(localVideoStore$.connect());

  subscription.add(songBoard$.connect());

  const noteToVideoClipIds$ = songBoard$.map(song =>
    mapValues(song.videoClips, (o: VideoClip) => o.videoClipId)
  );

  const remoteVideoClips$ = videoClipsForClipIds(noteToVideoClipIds$)
    .startWith({})
    .publishReplay();

  const videoClipSources$ = Observable.combineLatest(
    localVideoStore$,
    remoteVideoClips$,
    (local, remote) => ({ ...remote, ...local })
  );

  const videoClipIds$ = noteToVideoClipIds$.map(objectValues);

  const remoteAudioBuffersByVideoClipId$ = loadAudioBuffersFromVideoClipIds(
    videoClipIds$
  ).publishReplay();

  subscription.add(remoteAudioBuffersByVideoClipId$.connect());

  const remoteAudioBuffersByNote$ = Observable.combineLatest(
    noteToVideoClipIds$,
    remoteAudioBuffersByVideoClipId$,
    (noteToVideoClipIds, audioBuffers) => {
      return mapValues(
        noteToVideoClipIds,
        id => (audioBuffers[id] ? audioBuffers[id].value : null)
      );
    }
  );

  // Looks like { [note]: [audioBuffer], ... }
  const audioBuffers$ = Observable.combineLatest(
    localAudioBuffers$,
    remoteAudioBuffersByNote$,
    (local, remote) => ({ ...remote, ...local })
  );

  subscription.add(remoteVideoClips$.connect());

  const loading$ = Observable.combineLatest(
    noteToVideoClipIds$,
    remoteAudioBuffersByVideoClipId$,
    localAudioBuffers$,
    (noteToVideoClipIds, remoteAudioBufferResults, localAudioBuffers) =>
      mapValues(noteToVideoClipIds, (videoClipId, note) => {
        // Check to see if the remote audio buffer has loaded (or errored)
        if (remoteAudioBufferResults[videoClipId]) return false;

        // Check to see if the audio buffer has been recorded locally
        if (note in localAudioBuffers) return false;

        return true;
      })
  );

  // This datastructure contains the AudioBuffers and playbackParams for each
  // note.
  const audioSources$ = Observable.combineLatest(
    songBoard$.map(o => o.videoClips),
    audioBuffers$.map(o => mapValues(o, audioBuffer => ({ audioBuffer }))),
    (x, y) => merge({}, x, y)
  );

  const playbackParams$ = songBoard$.map(song =>
    mapValues(song.videoClips, (o: VideoClip) => o.playbackParams)
  );

  const noteConfiguration$ = Observable.combineLatest(
    videoClipSources$,
    playbackParams$,
    buildNoteConfiguration
  );

  return {
    songBoard$,
    noteConfiguration$,
    audioSources$,
    clearedEvents$,
    recordedMedia$,
    loading$
  };
}

const defaultPlaybackParams: PlaybackParams = {
  trimStart: 0,
  trimEnd: 1,
  gain: 1,
  playbackRate: 1
};

function buildNoteConfiguration(
  videoClipSources: { [string]: VideoClipSources },
  playbackParams: { [string]: PlaybackParams }
): NoteConfiguration {
  return mapValues(videoClipSources, (sources, note) => ({
    playbackParams: playbackParams[note] || defaultPlaybackParams,
    sources: sources
  }));
}

// The Entertainer
const DEFAULT_SONG_ID = "-KjtoXV7i2sZ8b_Azl1y";

function objectValues<T>(object: { [string]: T }): Array<T> {
  return values(object);
}

function videoClipsForClipIds(
  clipIds$: Observable<VideoClipIdMap>
): Observable<VideoClipMap> {
  function resultSelector(clipIdToObjectMap, noteToClipIdMap) {
    const result = {};
    forEach(noteToClipIdMap, (clipId, note) => {
      if (clipId in clipIdToObjectMap) {
        result[note] = clipIdToObjectMap[clipId];
      }
    });
    return result;
  }

  return clipIds$.combineKeyValues(
    videoClipSourcesById,
    objectValues, // keySelector
    resultSelector
  );
}

function gatherPromises(obj) {
  return values(pick(obj.promises, values(obj.clipIds)));
}

type AudioBufferResult = {
  value: ?AudioBuffer,
  error: ?Error
};

function audioBufferForVideoClipId(
  clipId: VideoClipId
): Observable<AudioBufferResult> {
  return Observable.fromPromise(urlFor(clipId, "-audio.mp4"))
    .switchMap(getAudioBuffer)
    .map(value => ({ value, error: null }))
    .catch(error => Observable.of({ value: null, error }));
}

function loadAudioBuffersFromVideoClipIds(
  videoClipIds$: Observable<Array<VideoClipId>>
): Observable<{ [VideoClipId]: AudioBufferResult }> {
  return videoClipIds$.combineKeyValues(audioBufferForVideoClipId);
}

const formats = ["webm", "mp4", "ogv"];

export function videoClipSourcesById(
  clipId: string
): Observable<VideoClipSources> {
  const sources$ = Observable.defer(() =>
    promiseFromTemplate({
      clipId: clipId,
      videoUrls: formats.map(format => ({
        src: urlFor(clipId, "." + format),
        type: "video/" + format
      })),
      posterUrl: urlFor(clipId, ".png")
    })
  );
  return waitForTranscode(firebase.database(), clipId).concat(sources$);
}

function urlFor(clipId, suffix) {
  return firebase
    .storage()
    .ref("video-clips")
    .child(clipId + suffix)
    .getDownloadURL();
}

// simulate a reduce() call because firebase doesn't have one.
function snapshotReduce(snapshot, fn, initial) {
  let state = initial;
  snapshot.forEach(function(child) {
    state = fn(state, child.val());
  });
  return state;
}

function decodeAudioData(arraybuffer) {
  // Safari doesn't support the Promise syntax for decodeAudioData, so we need
  // to make the promise ourselves.
  return new Promise(
    audioContext.decodeAudioData.bind(audioContext, arraybuffer)
  );
}

function getAudioBuffer(url) {
  return getArrayBuffer(url).switchMap(decodeAudioData);
}

function reduceToLocalAudioBufferStore(acc, finalMedia) {
  if (finalMedia.cleared) {
    return omit(acc, finalMedia.note);
  } else {
    return {
      ...acc,
      [finalMedia.note]: finalMedia.audioBuffer
    };
  }
}

// TODO: There should be a corresponding call to URL.revokeObjectURL
function reduceToLocalVideoClipStore(acc, obj) {
  if (obj.cleared) {
    return omit(acc, obj.note);
  } else {
    return {
      ...acc,
      [obj.note]: {
        videoUrls: [
          {
            src: URL.createObjectURL(obj.videoBlob),
            type: obj.videoBlob.type
          }
        ]
      }
    };
  }
}
