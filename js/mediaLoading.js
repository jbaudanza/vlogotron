import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";

import audioContext from "./audioContext";

import { getArrayBuffer } from "./http";

import {
  pickBy,
  keys,
  includes,
  clone,
  omit,
  forEach,
  values,
  pick,
  sum,
  mapValues,
  identity
} from "lodash";

import promiseFromTemplate from "./promiseFromTemplate";

// This is the UID that is loaded on the root URL. (It's me, Jon B!)
const DEFAULT_UID = "b7Z6g5LFN7SiyJpAnxByRmuSHuV2";

export function mediaStateFromRoute(currentPathname$, currentUser$) {
  return Observable.combineLatest(currentPathname$, currentUser$, mapRouteToUid)
    .distinctUntilChanged()
    .switchMap(switchMapFromUid);
}

function mapRouteToUid(pathname, currentUserId) {
  console.log("woot", pathname, currentUserId);
  if (pathname === "/") {
    return DEFAULT_UID;
  } else if (pathname === "/record-videos" || pathname === "/song-editor") {
    // TODO: This is wrong
    //    return currentUserId;
    return DEFAULT_UID;
  } else {
    return null;
  }
}

function switchMapFromUid(uid, subscription) {
  if (uid == null) {
    return Observable.of({});
  } else {
    return Observable.create(function(observer) {
      const subscription = new Subscription();
      console.log("subscribing to media");

      const videoClips$ = videoClipsForUid(uid).publishReplay();
      subscription.add(videoClips$.connect());

      // Looks like { [note]: [audioBuffer], ... }
      const { audioBuffers$, loading$ } = loadAudioBuffersFromVideoClips(
        videoClips$,
        subscription
      );

      observer.next({
        videoClips$,
        audioBuffers$,
        loading$
      });

      return subscription;
    });
  }
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
function videoClipsForUid(uid) {
  const eventsRef = firebase.database().ref("video-clip-events").child(uid);
  const videosRef = firebase.storage().ref("video-clips").child(uid);

  return Observable.fromEvent(eventsRef.orderByKey(), "value")
    .map(mapEventSnapshotToActiveClipIds)
    .scan(reduceClipIdsToPromises.bind(null, videosRef), { promises: {} })
    .switchMap(obj =>
      Observable.merge(...gatherPromises(obj)).reduce(
        (acc, obj) => Object.assign({}, acc, obj),
        {}
      )
    )
    .startWith({});
}

function gatherPromises(obj) {
  return values(pick(obj.promises, values(obj.clipIds)));
}

function loadAudioBuffersFromVideoClips(videoClips$, subscription) {
  const loadingContext$ = videoClips$
    .map(o => mapValues(o, v => v.audioUrl)) // { [note]: [url], ... }
    .scan(reduceToAudioBuffers, {})
    .publishReplay();

  // Looks like { [note]: [audioBuffer], ... }
  const audioBuffers$ = loadingContext$
    .mergeMap(obj => Observable.merge(...obj.promises))
    .scan((acc, obj) => Object.assign({}, acc, obj), {});

  const http$ = loadingContext$.flatMap(c =>
    Observable.from(values(pick(c.httpMap, c.newUrls)))
  );

  subscription.add(loadingContext$.connect());

  const loading$ = http$
    .flatMap(http => Observable.of(+1).concat(http.response.then(r => -1)))
    .scan((i, j) => i + j, 0)
    .map(count => count > 0)
    .startWith(true);

  return { loading$, audioBuffers$ };
}

const formats = ["webm", "mp4", "ogv"];

function reduceClipIdsToPromises(ref, acc, clipIds) {
  const next = {
    clipIds: clipIds,
    promises: {}
  };

  forEach(clipIds, (clipId, note) => {
    if (clipId in acc.promises) {
      next.promises[clipId] = acc.promises[clipId];
    } else {
      next.promises[clipId] = mapClipIdToPromise(ref, clipId).then(result => ({
        [note]: result
      }));
    }
  });

  return next;
}

function mapClipIdToPromise(ref, clipId) {
  function urlFor(clipId, suffix) {
    return ref.child(clipId + suffix).getDownloadURL();
  }

  return promiseFromTemplate({
    clipId: clipId,
    sources: formats.map(format => ({
      src: urlFor(clipId, "." + format),
      type: "video/" + format
    })),
    poster: urlFor(clipId, ".png"),
    audioUrl: urlFor(clipId, "-audio.mp4")
  });
}

function mapEventSnapshotToActiveClipIds(snapshot) {
  let acc = {
    uploadedNotes: {},
    transcodedClips: []
  };

  // simulate a reduce() call because firebase doesn't have one.
  snapshot.forEach(function(child) {
    const event = child.val();
    acc = reduceEventsToVideoClipState(acc, event);
  });

  return pickBy(acc.uploadedNotes, v => includes(acc.transcodedClips, v));
}

function reduceEventsToVideoClipState(acc, event) {
  let note = event.note;

  // All new notes should have an octave. Some legacy ones don't
  if (event.note && !note.match(/\d$/)) {
    note += "4";
  }

  if (event.type === "uploaded") {
    const uploadedNotes = Object.assign({}, acc.uploadedNotes, {
      [note]: event.clipId
    });
    return Object.assign({}, acc, { uploadedNotes });
  }

  if (event.type === "cleared") {
    const uploadedNotes = omit(acc.uploadedNotes, note);
    return Object.assign({}, acc, { uploadedNotes });
  }

  if (event.type === "transcoded") {
    return Object.assign({}, acc, {
      transcodedClips: acc.transcodedClips.concat(event.clipId)
    });
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
