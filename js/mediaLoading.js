import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";

import audioContext from "./audioContext";

import { getArrayBuffer } from "./http";

import { pathnameToRoute } from "./router";

import { subjectFor } from "./localWorkspace";
import { songById, waitForTranscode } from "./database";

import {
  clone,
  omit,
  forEach,
  values,
  pick,
  map,
  mapValues,
  identity
} from "lodash";

import promiseFromTemplate from "./promiseFromTemplate";

export function mapRouteToSongLocation(route) {
  switch (route.name) {
    case "root":
      return { source: "database", id: DEFAULT_SONG_ID };
    case "record-videos":
    case "note-editor":
      return {
        source: "localStorage",
        id: route.params.songId,
        remix: !!route.params.remix
      };
    case "view-song":
      return { source: "database", id: route.params.songId };
  }
  return { source: "none" };
}

const initialSong = {
  videoClips: {},
  notes: [],
  bpm: 120
};

function workspaceForSong(songLocation, song) {
  let key;
  if (songLocation.remix) {
    key = "vlogotron-remix-song:" + song.revisionId;
    const parentSong = { songId: song.songId, revisionId: song.revisionId };
    song = { ...omit(song, "songId", "revisionId"), parentSong };
  } else {
    key = "vlogotron-edit-song:" + song.revisionId;
  }

  return subjectFor(key, song);
}

export function subscribeToSongLocation(
  songLocation,
  defaultSongTitle,
  subscription
) {
  let song$;
  let workspace$;

  const null$ = Observable.of(null);
  switch (songLocation.source) {
    case "database":
      song$ = null$.concat(songById(songLocation.id)).publishReplay();
      subscription.add(song$.connect());
      break;
    case "localStorage":
      if (songLocation.id) {
        workspace$ = songById(songLocation.id)
          .take(1)
          .map(song => workspaceForSong(songLocation, song))
          .publishReplay();

        subscription.add(workspace$.connect());
      } else {
        const initialValue = {
          ...initialSong,
          title: defaultSongTitle
        };
        workspace$ = Observable.of(
          subjectFor("vlogotron-new-song", initialValue)
        );
      }

      song$ = null$.concat(workspace$.switch());

      break;
    default:
      song$ = null$;
  }

  const videoClipIds$ = song$.map(function(song) {
    if (song) {
      return song.videoClips;
    } else {
      return {};
    }
  });

  const videoClips$ = videoClipsForClipIds(videoClipIds$).publishReplay();

  const audioLoading = loadAudioBuffersFromVideoClips(
    videoClips$,
    subscription
  );

  subscription.add(videoClips$.connect());

  return {
    song$,
    videoClips$,
    workspace$,
    audioBuffers$: audioLoading.audioBuffers$,
    loading$: audioLoading.loading$
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
function videoClipsForClipIds(clipIds$) {
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
    videoClipById.bind(null, storageRef),
    values, // keySelector
    resultSelector
  );
}

function gatherPromises(obj) {
  return values(pick(obj.promises, values(obj.clipIds)));
}

export function loadAudioBuffersFromVideoClips(videoClips$, subscription) {
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
    .flatMap(http => Observable.of(+1).concat(http.response.then(r => -1)))
    .scan((i, j) => i + j, 0)
    .startWith(0)
    .map(count => count > 0);

  return { loading$, audioBuffers$ };
}

const formats = ["webm", "mp4", "ogv"];

function videoClipById(ref, clipId) {
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

  return waitForTranscode(clipId).concat(urls$);
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
  const next = {
    httpMap: clone(acc.httpMap || {}),
    promises: [],
    progressList: [],
    newUrls: []
  };

  forEach(noteToUrlMap, (url, note) => {
    if (!next.httpMap[url]) {
      const http = getAudioBuffer(url);

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
