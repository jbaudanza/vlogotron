import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";

import audioContext from "./audioContext";

import { getArrayBuffer } from "./http";

import { pathnameToRoute } from "./router";

import { subjectFor } from "./localWorkspace";

import {
  clone,
  omit,
  forEach,
  values,
  pick,
  map,
  mapValues,
  mapKeys,
  identity
} from "lodash";

import promiseFromTemplate from "./promiseFromTemplate";

import messages from "./messages";

export function mapRouteToSongLocation(route) {
  switch (route.name) {
    case "root":
      return { source: "database", id: DEFAULT_SONG_ID };
    case "record-videos":
    case "note-editor":
      return { source: "localStorage", id: "vlogotron-new-song" };
    case "view-song":
      return { source: "database", id: route.params.songId };
  }
  return { source: "none" };
}

export function subscribeToSongLocation(songLocation, subscription) {
  let song$;
  const null$ = Observable.of(null);
  switch (songLocation.source) {
    case "database":
      song$ = null$.concat(songById(songLocation.id)).publishReplay();
      subscription.add(song$.connect());
      break;
    case "localStorage":
      song$ = null$.concat(subjectFor(songLocation.id)).publishReplay();
      subscription.add(song$.connect());
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

  subscription.add(song$.connect());
  subscription.add(videoClips$.connect());

  return {
    song$,
    videoClips$,
    audioBuffers$: audioLoading.audioBuffers$,
    loading$: audioLoading.loading$
  };
}

function songById(songId) {
  const ref = firebase
    .database()
    .ref("songs")
    .child(songId)
    .child("revisions")
    .orderByKey()
    .limitToLast(1);

  return Observable.fromFirebaseRef(ref, "child_added")
    .map(snapshot => ({
      songId,
      ...snapshot.val()
    }))
    .map(convertFromFirebaseKeys)
    .map(fillInDefaults);
}

const DEFAULT_SONG_ID = "-KiY1cdo1ggMC-p3pG94";

function fillInDefaults(song) {
  const clone = Object.assign({}, song);
  if (!("videoClips" in song)) {
    clone.videoClips = {};
  }
  if (!("notes" in song)) {
    clone.notes = [];
  }
  return clone;
}

function convertFromFirebaseKeys(song) {
  return {
    ...song,
    videoClips: mapKeys(song.videoClips, (value, key) =>
      key.replace("sharp", "#")
    )
  };
}

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

function waitForTranscode(videoClipId) {
  return Observable.fromFirebaseRef(
    firebase
      .database()
      .ref("video-clips")
      .child(videoClipId)
      .child("transcodedAt"),
    "value"
  )
    .takeWhile(snapshot => !snapshot.exists())
    .ignoreElements();
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
    .map(count => count > 0)
    .startWith(true);

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

function reduceFirebaseCollection(collectionRef, accFn, initial) {
  const query = collectionRef.orderByKey();

  return Observable.fromFirebaseRef(query, "value")
    .first()
    .switchMap(snapshot => {
      let lastKey;
      let acc = initial;

      snapshot.forEach(function(child) {
        lastKey = child.key;
        acc = accFn(acc, child.val());
      });

      let rest$;
      if (lastKey) {
        rest$ = Observable.fromFirebaseRef(
          query.startAt(lastKey),
          "child_added"
        ).skip(1);
      } else {
        rest$ = Observable.fromFirebaseRef(query, "child_added");
      }

      return rest$
        .map(snapshot => snapshot.val())
        .scan(accFn, acc)
        .startWith(acc);
    });
}

function reduceEventsToVideoClipIds(acc, event) {
  let note = event.note;

  if (event.type === "added") {
    return {
      ...acc,
      [note]: event.videoClipId
    };
  }

  if (event.type === "cleared") {
    return omit(acc, note);
  }

  return acc;
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
