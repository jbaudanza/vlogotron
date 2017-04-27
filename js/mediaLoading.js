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

export function mediaForRoute(currentPathname$, currentUser$, subscription) {
  const songId$ = Observable.combineLatest(
    currentPathname$,
    currentUser$,
    mapRouteToSongId
  )
    .switch()
    .distinctUntilChanged()
    .publishReplay();

  const song$ = songId$
    .switchMap(songId => {
      if (songId != null) {
        return songById(songId);
      } else {
        return Observable.of(null);
      }
    })
    .publishReplay();

  const videoClips$ = song$
    .switchMap(song => (song ? videoClipsForSong(song) : Observable.of({})))
    .publishReplay();

  const audioLoading = loadAudioBuffersFromVideoClips(
    videoClips$,
    subscription
  );

  subscription.add(songId$.connect());
  subscription.add(song$.connect());
  subscription.add(videoClips$.connect());

  return {
    songId$,
    song$,
    videoClips$,
    audioBuffers$: audioLoading.audioBuffers$,
    loading$: audioLoading.loading$
  };
}

function songById(songId) {
  return firebase
    .database()
    .ref("songs")
    .child(songId)
    .once("value")
    .then(snapshot => Object.assign({ songId }, snapshot.val()));
}

function mapRouteToSongId(pathname, currentUser) {
  const databaseId = "([\w-]+)";
  const songsRe = new RegExp(`^/songs/${databaseId}$`);
  let match;

  const noSong$ = Observable.of(null);

  if (pathname === "/record-videos" || pathname === "/song-editor") {
    if (currentUser) {
      return noSong$.concat(findOrCreateWorkspaceSongId(currentUser.uid));
    } else {
      return noSong$;
    }
  } else if ((match = songsRe.match(pathname))) {
    return Observable.of(match[1]);
  } else {
    return noSong$;
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
function videoClipsForSong(song) {
  const songRef = firebase.database().ref("songs").child(song.songId);
  const storageRef = firebase.storage().ref("video-clips");

  const clipsIds$ = Observable.fromEvent(songRef.child("events"), "value").map(
    mapEventSnapshotToActiveClipIds
  );

  return clipsIds$
    .scan((acc, clipIds) => reduceClipIdsToPromises(storageRef, acc, clipIds), {
      promises: {}
    })
    .switchMap(obj =>
      Observable.merge(...gatherPromises(obj)).reduce(
        (acc, obj) => Object.assign({}, acc, obj),
        {}
      )
    )
    .startWith({});
}

function waitForTranscode(videoClipId) {
  return Observable.fromEvent(
    firebase
      .database()
      .ref("video-clips")
      .child(videoClipId)
      .child("transcodedAt"),
    "value"
  )
    .takeWhile(snapshot => !snapshot.exists())
    .toPromise();
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
    .scan((acc, obj) => Object.assign({}, acc, obj), {})
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

  return waitForTranscode(clipId).then(() => {
    return promiseFromTemplate({
      clipId: clipId,
      sources: formats.map(format => ({
        src: urlFor(clipId, "." + format),
        type: "video/" + format
      })),
      poster: urlFor(clipId, ".png"),
      audioUrl: urlFor(clipId, "-audio.mp4")
    });
  });
}

function mapEventSnapshotToActiveClipIds(snapshot) {
  // simulate a reduce() call because firebase doesn't have one.
  let acc = {};
  snapshot.forEach(function(child) {
    const event = child.val();
    acc = reduceEventsToVideoClipState(acc, event);
  });
  return acc;
}

function reduceEventsToVideoClipState(acc, event) {
  let note = event.note;

  if (event.type === "added") {
    return Object.assign({}, acc, {
      [note]: event.videoClipId
    });
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

function findOrCreateWorkspaceSongId(uid) {
  const workspaceSongIdRef = firebase
    .database()
    .ref("users")
    .child(uid)
    .child("workspaceSongId");

  return workspaceSongIdRef.once("value").then(function(snapshot) {
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      const songRef = firebase.database().ref("songs").push({
        title: messages["default-song-title"](),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        uid: uid,
        visibility: "owner"
      });

      return songRef.then(function(ref) {
        workspaceSongIdRef.set(ref.key);
        return ref.key;
      });
    }
  });
}
