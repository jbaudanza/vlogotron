/* @flow */
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";
import { Subject } from "rxjs/Subject";

import * as firebase from "firebase";

import audioContext from "./audioContext";

import { getArrayBuffer } from "./http";

import type { Route } from "./router";

import { findSongBoard, waitForTranscode } from "./database";
import type { SongBoard, VideoClip } from "./database";
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

  const videoClipIds$ = songBoard$.map(song =>
    mapValues(song.videoClips, (o: VideoClip) => o.videoClipId)
  );

  const remoteVideoClips$ = videoClipsForClipIds(videoClipIds$)
    .startWith({})
    .publishReplay();

  const videoClipSources$ = Observable.combineLatest(
    localVideoStore$,
    remoteVideoClips$,
    (local, remote) => ({ ...remote, ...local })
  );

  const audioLoading = loadAudioBuffersFromVideoClips(
    remoteVideoClips$,
    subscription
  );

  // Looks like { [note]: [audioBuffer], ... }
  const audioBuffers$ = Observable.combineLatest(
    localAudioBuffers$,
    audioLoading.audioBuffers$,
    (local, remote) => ({ ...remote, ...local })
  );

  subscription.add(remoteVideoClips$.connect());

  // If we have some local recorded audio buffers, we can remove them
  // from the list of remote audio buffers being loaded.
  const loading$ = Observable.combineLatest(
    audioLoading.loading$,
    localAudioBuffers$,
    (remote, local) => pickBy(remote, (value, note: string) => !(note in local))
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
    values, // keySelector
    resultSelector
  );
}

function gatherPromises(obj) {
  return values(pick(obj.promises, values(obj.clipIds)));
}

export function loadAudioBuffersFromVideoClips(
  videoClips$: Observable<Object>,
  subscription: Subscription
) {
  const loadingContext$ = videoClips$
    .map(o => mapValues(o, v => v.audioUrl)) // { [note]: [url], ... }
    .scan(reduceToAudioBuffers, {})
    .publishReplay();

  // Looks like { [note]: [audioBuffer], ... }
  const audioBuffers$ = loadingContext$
    .mergeMap(obj => Observable.merge(...obj.promises))
    .scan((acc, obj) => ({ ...acc, ...obj }), {})
    .startWith({})
    .publishReplay();

  const http$ = loadingContext$.flatMap(c =>
    Observable.from(values(pick(c.httpMap, c.newUrls)))
  );

  subscription.add(loadingContext$.connect());
  subscription.add(audioBuffers$.connect());

  const loading$ = http$
    .flatMap(http =>
      Observable.of({ [http.note]: true }).concat(
        http.response.then(r => ({ [http.note]: false }))
      )
    )
    .scan((acc, i) => pickBy({ ...acc, ...i }), {})
    .startWith({});

  return { loading$, audioBuffers$ };
}

const formats = ["webm", "mp4", "ogv"];

export function videoClipSourcesById(
  clipId: string
): Observable<VideoClipSources> {
  function urlFor(clipId, suffix) {
    return firebase
      .storage()
      .ref("video-clips")
      .child(clipId + suffix)
      .getDownloadURL();
  }

  const sources$ = Observable.defer(() =>
    promiseFromTemplate({
      clipId: clipId,
      videoUrls: formats.map(format => ({
        src: urlFor(clipId, "." + format),
        type: "video/" + format
      })),
      posterUrl: urlFor(clipId, ".png"),
      audioUrl: urlFor(clipId, "-audio.mp4")
    })
  );
  return waitForTranscode(firebase.database(), clipId).concat(sources$);
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
  const http = getArrayBuffer(url);
  http.audioBuffer = http.response.then(decodeAudioData);
  return http;
}

function reduceToAudioBuffers(acc, noteToUrlMap) {
  const next: Object = {
    httpMap: clone(acc.httpMap || {}),
    promises: [],
    progressList: [],
    newUrls: []
  };

  forEach(noteToUrlMap, (url, note) => {
    if (!next.httpMap[url]) {
      const http = getAudioBuffer(url);
      http.note = note;

      next.promises.push(http.audioBuffer.then(buffer => ({ [note]: buffer })));
      next.progressList.push(http.progress);
      next.newUrls.push(url);

      next.httpMap[url] = http;
    }
  });

  next.active = values(noteToUrlMap)
    .map(url => next.httpMap[url])
    .filter(identity);

  return next;
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
