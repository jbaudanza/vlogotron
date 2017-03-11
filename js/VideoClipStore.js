import {
  pick, pickBy, includes, identity, omit, without, mapValues, flatten, max,
  clone, forEach, values, sum, isEmpty
} from 'lodash';

import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

import {animationFrame} from 'rxjs/scheduler/animationFrame';

import {playbackSchedule} from './playbackSchedule';

import audioContext from './audioContext';


import createHistory from 'history/createBrowserHistory';

import promiseFromTemplate from './promiseFromTemplate';


function reduceToLocalUrls(acc, obj) {
  if (obj.blob) {
    return Object.assign({}, acc, {[obj.note]: {
      clipId: obj.clipId,
      sources: [{
        src: URL.createObjectURL(obj.blob),
        type: obj.blob.type
      }]}}
    );
  } else {
    return omit(acc, obj.note);
  }
}

export function navigate(href) {
  urlHistory.push(href);
}

const urlHistory = createHistory();

const currentUser$ = Observable.create(function(observer) {
  firebase.auth().onAuthStateChanged((user) => observer.next(user));
});

const currentLocation$ = Observable.create((observer) => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});

export const currentRoute$ = Observable.combineLatest(
  currentLocation$, currentUser$, mapToRoute
).startWith({mode: 'loading'});


// This is the UID that is loaded on the root URL. (It's me, Jon B!)
const DEFAULT_UID = 'b7Z6g5LFN7SiyJpAnxByRmuSHuV2';


function urlForUid(uid) {
  const baseUrl = document.location.protocol + '//' + document.location.host;

  if (uid === DEFAULT_UID) {
    return baseUrl + '/';
  } else {
    return baseUrl + '/u' + uid;
  }
}

function mapToRoute(location, user) {
  let match;

  if (location.pathname === '/') {
    return {mode: 'playback', uid: DEFAULT_UID, shareUrl: urlForUid(DEFAULT_UID)};
  } else if (location.pathname === '/record') {
    const obj = {mode: 'record'};
    if (user) {
      obj.uid = user.uid;
      obj.shareUrl = urlForUid(user.uid);
      obj.displayName = user.displayName;
    } else {
      obj.uid = null;
      obj.overlay = 'login';
    }
    return obj;
  } else if (match = location.pathname.match(/\/u\/([\w-]+)/)) {
    return {mode: 'playback', uid: match[1], shareUrl: urlForUid(match[1])};
  } else {
    return {mode: 'not-found'};
  }
}


const refs$ = currentRoute$
  .map((route) => {
    if (route.uid)
      return refsForUids(route.uid)
    else
      return null;
  });


function mapEventSnapshotToActiveClipIds(snapshot) {
  const uploadedNotes = {};
  const transcodedClips = [];

  snapshot.forEach(function(child) {
    const event = child.val();
    let note = event.note;

    // All new notes should have an octave. Some legacy ones don't
    if (event.note && !note.match(/\d$/)) {
      note += '4';
    }

    if (event.type === 'uploaded') {
      uploadedNotes[note] = event.clipId;
    }

    if (event.type === 'cleared') {
      delete uploadedNotes[note];
    }

    if (event.type === 'transcoded') {
      transcodedClips.push(event.clipId);
    }
  });

  return pickBy(uploadedNotes, (v) => includes(transcodedClips, v));
}


const formats = ['webm', 'mp4', 'ogv'];


function mapClipIdToPromise(ref, clipId) {
  function urlFor(clipId, suffix) {
    return ref.child(clipId + suffix).getDownloadURL()
  }

  return promiseFromTemplate({
    clipId: clipId,
    sources: formats.map(format => ({
      src: urlFor(clipId, '.' + format),
      type: "video/" + format
    })),
    poster: urlFor(clipId, '.png'),
    audioUrl: urlFor(clipId, '-audio.mp4')
  });
}

function reduceClipIdsToPromises(ref, acc, clipIds) {
  const next = {
    exists: clone(acc.exists), promises: []
  };

  forEach(clipIds, (clipId, note) => {
    if (!(clipId in next.exists)) {
      next.promises.push(
        mapClipIdToPromise(ref, clipId)
            .then((result) => ({[note]: result}))
      );
      next.exists[clipId] = true;
    }
  });

  return next;
}

function mapRefsToRemoteUrls(refs) {
  if (refs) {
    return Observable
        .fromEvent(refs.events.orderByKey(), 'value')
        .map(mapEventSnapshotToActiveClipIds)
        .scan(reduceClipIdsToPromises.bind(null, refs.videos), {exists: {}})
        .mergeMap((obj) => Observable.merge(...obj.promises))
        .scan((acc, obj) => Object.assign({}, acc, obj), {});
  } else {
    return Promise.resolve({});
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
const remoteUrls$ = refs$.switchMap(mapRefsToRemoteUrls).startWith({});

// XXX: left off here. Come up with a data structure to expose to the UI that
// communicates loading progress
// Loading states
//  - Nothing loaded - waiting for database
//  - Database returned - calling getDownloadURLs
//  - Got download URLS - waiting for HTTP
//  - HTTP started, progress events
//  - Finished
function getArrayBuffer(url) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";

  const response = new Promise((resolve, reject) => {
    xhr.onload = function(event) { resolve(xhr.response); }
    xhr.onerror = reject;
  });

  const contentLengthFromResponse = response.then((ab) => ab.byteLength);

  function getContentLength() {
    const header = xhr.getResponseHeader('Content-Length');
    if (header != null) {
      return parseInt(header);
    } else {
      return null;
    }
  }

  const contentLength = Observable
      .fromEvent(xhr, 'readystatechange')
      .takeWhile(e => e.target.readyState < 2) // 2 = XMLHttpRequest.HEADERS_RECEIVED
      .toPromise()
      .then(getContentLength);

  const progress = Observable.fromEvent(xhr, 'progress')
      .takeUntil(response);

  const loaded = Observable.merge(
    progress.filter(e => e.lengthComputable).map(e => e.loaded),
    contentLengthFromResponse
  );

  xhr.send(null);

  return {progress, response, contentLength, loaded};
}


function decodeAudioData(arraybuffer) {
  // Safari doesn't support the Promise syntax for decodeAudioData, so we need
  // to make the promise ourselves.
  return new Promise(audioContext.decodeAudioData.bind(audioContext, arraybuffer));
}

function getAudioBuffer(url, progressSubscriber) {
  const http = getArrayBuffer(url);
  http.audioBuffer = http.response.then(decodeAudioData);
  return http;
}

// Audio buffers will be pushed here as they are recorded.
// {note: 'A', clipId: 'xasdf', buffer: AudioBuffer}
const newAudioBuffers$ = new Subject();

function reduceToLocalAudioBuffers(acc, obj) {
  if (obj.buffer) {
    return Object.assign({}, acc, {[obj.note]: obj.buffer});
  } else {
    return omit(acc, obj.note);
  }
}

const localAudioBuffers$ = currentRoute$.switchMap(function(route) {
  if (route.mode === 'record' && route.uid) {
    return newAudioBuffers$.scan(reduceToLocalAudioBuffers, {}).startWith({});
  } else {
    return Observable.of({});
  }
});

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

      next.promises.push(
        http.audioBuffer.then(buffer => ({[note]: buffer}))
      );
      next.progressList.push(http.progress);
      next.newUrls.push(url);

      next.httpMap[url] = http;
    }
  });

  next.active = values(noteToUrlMap)
      .map(url => next.httpMap[url])
      .filter(identity)

  return next;
}

const loadingContext$ = remoteUrls$
  .map(o => mapValues(o, v => v.audioUrl)) // { [note]: [url], ... }
  .scan(reduceToAudioBuffers, {});


const http$ = loadingContext$
  .flatMap(c => (
    Observable.from(values(pick(c.httpMap, c.newUrls)))
  ));


const loaded$ = http$
  .scan((acc, http) => acc.concat(http), [])
  .switchMap((list) => Observable.combineLatest(
    list.map(http => http.loaded)
  ))
  .map(sum)
  .startWith(0);

const total$ = http$
  .flatMap(http => http.contentLength)
  .scan((i, j) => i + j, 0);


// XXX: Left off here. Why is the loaded greater than the total sometimes?
//  - Maybe the progressEvent fires before the content-length header is ready
const progress$ = Observable.combineLatest(loaded$, total$, (loaded, total) => loaded / total);


// High-order observable of progress event streams from all the audio buffer
// downloads currently in progress.
const progressStreams$ = loadingContext$.flatMap(x => Observable.from(x.progressList));



// Looks like { [note]: [audioBuffer], ... }
const remoteAudioBuffers$ = loadingContext$
  .mergeMap(obj => Observable.merge(...obj.promises))
  .scan((acc, obj) => Object.assign({}, acc, obj), {});

export const audioLoading$ = http$
    .flatMap((http) => Observable.of(+1).concat(http.response.then(r => -1)))
    .scan((i, j) => i + j, 0)
    .map((count) => count > 0)
    .startWith(true);

const audioBuffers$ = Observable.combineLatest(
  localAudioBuffers$,
  remoteAudioBuffers$,
  (local, remote) => Object.assign({}, local, remote)
).publishReplay().refCount();

function refsForUids(uid) {
  return {
    events:   firebase.database().ref('video-clip-events').child(uid),
    videos:   firebase.storage().ref('video-clips').child(uid),
    uploads:  firebase.storage().ref('uploads').child(uid),
    uid:      uid
  };
}

// TODO:
//  - track the tasks somehow
//  - display upload progress to user
//  - URL.revokeObjectURL(url)    
export default class VideoClipStore {
  constructor() {
    const localBlobs = new Subject();
    const uploadTasks = new BehaviorSubject([]);
    const clearActions = new Subject();

    this.clearClip = function(note) {
      clearActions.next(note);
      localBlobs.next({note, blob: null});
    };

    this.addMedia = function(note, clipId, videoBlob, audioBuffer) {
      localBlobs.next({note, clipId, blob: videoBlob});
      newAudioBuffers$.next({note, clipId, buffer: audioBuffer});
    }

    const localBlobChanges$ = Observable.combineLatest(
      localBlobs,
      currentUser$.map((user) => user ? refsForUids(user.uid) : null)
    )

    localBlobChanges$.subscribe(function([change, refs]) {
      if (!(change.blob && refs))
        return;

      const uploadRef = refs.uploads.child(change.clipId);

      const task = uploadRef.put(change.blob);
      uploadTasks.next(uploadTasks._value.concat(task));

      task.then(function() {
        refs.events.push({type: 'uploaded', clipId: change.clipId, note: change.note});
        uploadTasks.next(without(uploadTasks._value, task))
      });
    });

    Observable.combineLatest(refs$.filter(identity), clearActions)
      .subscribe(function([refs, note]) {
        refs.events.push({type: 'cleared', note: note});
      });

    const localUrls = currentRoute$.switchMap(function(route) {
      if (route.mode === 'record' && route.uid) {
        return localBlobs.scan(reduceToLocalUrls, {}).startWith({});
      } else {
        return Observable.of({});
      }
    });

    this.videoClips$ = Observable.combineLatest(
        localUrls,
        remoteUrls$,
        (local, remote) => Object.assign({}, remote, local)
    );
  }
}


const gainNode = audioContext.createGain();
gainNode.gain.value = 0.9;
gainNode.connect(audioContext.destination);

function makeNode(audioBuffer, startTime) {
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(gainNode);
  return source;
}


export function subscribeToAudioPlayback(playCommands$) {
  const activeNodes = {};

  return playCommands$
    .withLatestFrom(audioBuffers$)
    .subscribe(([cmd, audioBuffers]) => {
      if (cmd.play && audioBuffers[cmd.play]) {
        activeNodes[cmd.play] = makeNode(audioBuffers[cmd.play]);
        activeNodes[cmd.play].start();
      }

      if (cmd.pause && activeNodes[cmd.pause]) {
        activeNodes[cmd.pause].stop();
      }
    });
}


function timestampToBeats(timestamp, bpm) {
  return (timestamp / 60.0) * bpm;
}

function beatsToTimestamp(beats, bpm) {
  return (beats / bpm) * 60;
}

export const playCommands$ = new Subject();


export function startPlayback(song, playUntil$) {
  const bpm = 120;

  const playbackStartedAt = audioContext.currentTime + 0.125;

  function mapToNotes(beatWindow) {
    const [beatFrom, beatTo] = beatWindow;
    return song.filter((note) => note[1] >= beatFrom && note[1] < beatTo);
  }

  const songLengthInBeats = max(song.map(note => note[1] + note[2]));

  const commands$ = Observable.from(flatten(song.map(function(note) {
    const startAt = playbackStartedAt + beatsToTimestamp(note[1], bpm);
    const stopAt =  startAt + beatsToTimestamp(note[2], bpm);

    function makeEvent(obj, when) {
      return Observable.of(
        Object.assign({when}, obj)
      ).delay((when - audioContext.currentTime) * 1000);
    }

    return [
        makeEvent({play: note[0]}, startAt), makeEvent({pause: note[0]}, stopAt)
    ];
  }))).mergeAll().takeUntil(playUntil$);

  commands$.subscribe((cmd) => playCommands$.next(cmd));

  // Returns the time window (in beats) that need to be scheduled
  function makeBeatWindow(lastWindow, playbackUntilTimestamp) {
    return [
      lastWindow[1],
      timestampToBeats(playbackUntilTimestamp - playbackStartedAt, bpm)
    ];
  }

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.9;
  gainNode.connect(audioContext.destination);
  // Silence all audio when the pause button is hit
  playUntil$.subscribe(x => gainNode.gain.value = 0)

  playbackSchedule(audioContext)
      .takeUntil(playUntil$)
      .scan(makeBeatWindow, [null, 0])
      // TODO: This really should be takeUntil with a predicate function, but
      // that doesn't exist. Right now we're emitting one more than we need to.
      .takeWhile(beatWindow => beatWindow[0] < songLengthInBeats)
      .map(mapToNotes)
      .withLatestFrom(audioBuffers$)
      .subscribe({
        next([commands, audioBuffers]) {
          commands.forEach((command) => {
            const audioBuffer = audioBuffers[command[0]];
            if (audioBuffer) {
              const startAt = playbackStartedAt + beatsToTimestamp(command[1], bpm);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNode);

              let offset;
              if (audioContext.currentTime > startAt) {
                offset = audioContext.currentTime - startAt;
                console.warn('scheduling playback late.', offset);
              } else {
                offset = 0;
              }
              source.start(startAt, offset, beatsToTimestamp(command[2], bpm));
            } else {
              console.warn('missing audiobuffer for', command[0])
            }
          })
        }
      });

  const position$ = Observable
      .of(0, animationFrame)
      .repeat()
      .map(() => timestampToBeats(audioContext.currentTime - playbackStartedAt, bpm))
      .takeWhile(beat => beat < songLengthInBeats)
      .takeUntil(playUntil$);

  return {
    position: position$,
    finished: Observable.merge(
        playUntil$,
        Observable.of(1).delay(beatsToTimestamp(songLengthInBeats, bpm) * 1000
    )).first().toPromise()
  }
};
