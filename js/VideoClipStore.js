import {
  pickBy, includes, identity, omit, without, mapValues, flatten
} from 'lodash';

import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

import {playbackSchedule} from './playbackSchedule';
import {song} from './song';

import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/publishReplay';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/withLatestFrom';

import 'rxjs/add/observable/never';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/fromPromise';


// TODO: This is duplicated in Instrument.js
const audioContext = new (window.AudioContext || window.webkitAudioContext)();


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


function reduceEventSnapshotToActiveClipIds(snapshot) {
  const uploadedNotes = {};
  const transcodedClips = [];

  snapshot.forEach(function(child) {
    const event = child.val();
    if (event.type === 'uploaded') {
      uploadedNotes[event.note] = event.clipId;
    }

    if (event.type === 'cleared') {
      delete uploadedNotes[event.note];
    }

    if (event.type === 'transcoded') {
      transcodedClips.push(event.clipId);
    }
  });

  return pickBy(uploadedNotes, (v) => includes(transcodedClips, v));
}


const formats = ['webm', 'mp4', 'ogv'];


function mapClipIdsToRemoteUrls(clipIds, ref) {
  function urlFor(clipId, suffix) {
    return ref.child(clipId + suffix).getDownloadURL()
  }
  return Observable.fromPromise(
    promiseFromTemplate(
      mapValues(clipIds, clipId => ({
        clipId: clipId,
        sources: formats.map(format => ({
          src: urlFor(clipId, '.' + format),
          type: "video/" + format
        })),
        poster: urlFor(clipId, '.png'),
        audioUrl: urlFor(clipId, '-audio.mp4')
      }))
    )
  ).startWith({}); // Empty set while resolving URLs.
}


function reduceToRemoteUrls(refs) {
  if (refs) {
    return Observable
        .fromEvent(refs.events.orderByKey(), 'value')
        .map(reduceEventSnapshotToActiveClipIds)
        .switchMap(activeClipIds => (
          mapClipIdsToRemoteUrls(activeClipIds, refs.videos)
        ));
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
const remoteUrls$ = refs$.switchMap(reduceToRemoteUrls).startWith({});

const progress = new Subject();

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

  //xhr.onprogress = (e) => console.log('progress', e)
  xhr.send(null);

  return new Promise(function(resolve, reject) {
    xhr.onload = function(event) { resolve(xhr.response); }
    xhr.onerror = reject;
  });
}


function decodeAudioData(arraybuffer) {
  // Safari doesn't support the Promise syntax for decodeAudioData, so we need
  // to make the promise ourselves.
  return new Promise(audioContext.decodeAudioData.bind(audioContext, arraybuffer));
}

function getAudioBuffer(url, progressSubscriber) {
  return getArrayBuffer(url).then(decodeAudioData);
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

const remoteAudioBuffers$ = remoteUrls$
  .map(o => mapValues(o, v => v.audioUrl))
  .switchMap((o) => (
    promiseFromTemplate(mapValues(o, (url) => getAudioBuffer(url, progress)))
  ));

const audioBuffers$ = Observable.combineLatest(
  localAudioBuffers$,
  remoteAudioBuffers$,
  (local, remote) => Object.assign({}, local, remote)
).publishReplay().refCount();

const queue = firebase.database().ref('queue/tasks');

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

        queue.push({
          note:   change.note,
          clipId: change.clipId,
          uid:    refs.uid
        });

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

window.playback = function() {
  const bpm = 90;

  const playbackStartedAt = audioContext.currentTime + 0.125;

  // TODO: Is there some fancier way to store this state?
  let scheduledUntil = 0;

  console.log('playbackStartedAt', playbackStartedAt)

  function mapToNotes(playbackUntilTimestamp) {
    const playbackUntilBeats = timestampToBeats(playbackUntilTimestamp - playbackStartedAt, bpm);

    const notes = song.filter((note) => note[1] >= scheduledUntil && note[1] < playbackUntilBeats)
    scheduledUntil = playbackUntilBeats;
    return notes;
  }

  const commands$ = Observable.from(flatten(song.map(function(note) {
    const startAt = playbackStartedAt + beatsToTimestamp(note[1], bpm);
    const stopAt =  startAt + beatsToTimestamp(note[2], bpm);

    return [
      Observable.of({play: note[0]}).delay((startAt - audioContext.currentTime) * 1000),
      Observable.of({pause: note[0]}).delay((stopAt - audioContext.currentTime) * 1000)
    ]
  }))).mergeAll();

  commands$.subscribe((cmd) => playCommands$.next(cmd));

  playbackSchedule(audioContext)
      .map(mapToNotes)
      .withLatestFrom(audioBuffers$)
      .subscribe(function([commands, audioBuffers]) {
        commands.forEach((command) => {
          const audioBuffer = audioBuffers[command[0]];
          if (audioBuffer) {
            const startAt = playbackStartedAt + beatsToTimestamp(command[1], bpm);
            const node = makeNode(audioBuffer, startAt);
            node.start(startAt, 0, beatsToTimestamp(command[2], bpm));
          } else {
            console.warn('missing audiobuffer for', command[0])
          }
        })
      });
};
