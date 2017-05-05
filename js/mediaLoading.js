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
  identity
} from "lodash";

import promiseFromTemplate from "./promiseFromTemplate";

const messages = require("messageformat-loader!json-loader!./messages.json");

export function mediaForRoute(currentPathname$, currentUser$, subscription) {
  const song$ = Observable.combineLatest(
    currentPathname$,
    currentUser$,
    mapRouteToSong
  )
    .switch()
    // TODO: I don't think this is really blocking dupes
    .distinctUntilChanged()
    .publishReplay();

  // TODO: This will faill if null
  const videoClips$ = videoClipsForClipIds(
    song$.map(o => o.videoClips)
  ).publishReplay();

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
  const ref = firebase.database().ref("songs").child(songId);

  return Observable.fromFirebaseRef(ref, "value").map(snapshot => ({
    songId,
    ...snapshot.val()
  }));
}

const DEFAULT_SONG_ID = "-KiY1cdo1ggMC-p3pG94";

function mapRouteToSong(pathname, currentUser) {
  const null$ = Observable.of(null);

  const route = pathnameToRoute(pathname);
  if (route) {
    switch (route.name) {
      case "root":
        return songById(DEFAULT_SONG_ID);
      case "record-videos":
      case "note-editor":
        return subjectFor("vlogotron-new-song");
      case "view-song":
        return songById(route.params.songId);
    }
  }

  return null$;
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
