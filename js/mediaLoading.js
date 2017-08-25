/* @flow */
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";
import { Subject } from "rxjs/Subject";

import audioContext from "./audioContext";

import { getArrayBuffer } from "./http";

import type { Route } from "./router";

import { findSongBoard, waitForTranscode } from "./database";
import type { SongBoard, FirebaseDatabase, VideoClip } from "./database";
import type { AudioSourceMap } from "./AudioPlaybackEngine";

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
  videoClips$: Observable<{ [string]: VideoClip }>,
  audioSources$: Observable<AudioSourceMap>,
  clearedEvents$: Subject<ClearedMedia>,
  recordedMedia$: Subject<CapturedMedia>,
  loading$: Observable<Object>
};

export function subscribeToSongBoardId(
  songBoardId: string,
  defaultSongTitle: string,
  firebase: FirebaseDatabase,
  subscription: Subscription
): Media {
  let localVideoStore$;
  let localAudioBuffers$;

  const clearedEvents$ = new Subject();
  const recordedMedia$ = new Subject();

  subscription.add(clearedEvents$);
  subscription.add(recordedMedia$);

  const database = firebase.database();

  const emptyObject$ = Observable.of({});

  const songBoard$ = findSongBoard(database, songBoardId).publishReplay();

  localAudioBuffers$ = Observable.merge(recordedMedia$, clearedEvents$)
    .scan(reduceToLocalAudioBufferStore, {})
    .startWith({})
    .publishReplay();

  localVideoStore$ = Observable.merge(recordedMedia$, clearedEvents$)
    .scan(reduceToLocalVideoClipStore, {})
    .startWith({})
    .publishReplay();

  subscription.add(localAudioBuffers$.connect());
  subscription.add(localVideoStore$.connect());

  subscription.add(songBoard$.connect());

  const videoClipIds$ = songBoard$.map(function(songBoard) {
    return mapValues(songBoard.videoClips, (v: VideoClip) => v.videoClipId);
  });

  const remoteVideoClips$ = videoClipsForClipIds(videoClipIds$, firebase)
    .startWith({})
    .publishReplay();

  const videoClips$ = Observable.combineLatest(
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

  // This datastructure contains the AudioBuffers and trimming info for each
  // note.
  const audioSources$ = Observable.combineLatest(
    songBoard$.map(o => o.videoClips),
    audioBuffers$.map(o => mapValues(o, audioBuffer => ({ audioBuffer }))),
    (x, y) => merge({}, x, y)
  );

  // This tacks on trimStart and trimEnd to the videoClip. It might be nice to
  // clean this up a bit
  const videoClipsWithTrim$ = Observable.combineLatest(
    videoClips$,
    songBoard$.map(song =>
      mapValues(song.videoClips, (o: VideoClip) => ({
        trimStart: o.trimStart,
        trimEnd: o.trimEnd,
        playbackRate: o.playbackRate
      }))
    ),
    (videoClips, trimSettings) => merge({}, videoClips, trimSettings)
  ).map(videoClips => pickBy(videoClips, v => "sources" in v));

  return {
    songBoard$,
    videoClips$: videoClipsWithTrim$,
    audioSources$,
    clearedEvents$,
    recordedMedia$,
    loading$
  };
}

// The Entertainer
const DEFAULT_SONG_ID = "-KjtoXV7i2sZ8b_Azl1y";

/*
  Emits objects that look like:
  {
    [note]: {
      clipId: 'abcd',
      sources: [...],
      poster: 'http://asdfadf'
    }
  }
*/
function videoClipsForClipIds(clipIds$, firebase) {
  const storageRef = firebase.storage().ref("video-clips");

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
    videoClipById.bind(null, firebase.database(), storageRef),
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

function videoClipById(database, ref, clipId) {
  function urlFor(clipId, suffix) {
    return ref.child(clipId + suffix).getDownloadURL();
  }

  const urls$ = Observable.defer(() =>
    promiseFromTemplate({
      clipId: clipId,
      sources: formats.map(format => ({
        src: urlFor(clipId, "." + format),
        type: "video/" + format
      })),
      poster: urlFor(clipId, ".png"),
      audioUrl: urlFor(clipId, "-audio.mp4")
    })
  );

  return waitForTranscode(database, clipId).concat(urls$);
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
