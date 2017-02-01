import {sample, times, pickBy, includes, identity} from 'lodash';

import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/switchMap';

import createHistory from 'history/createBrowserHistory';

import promiseFromTemplate from './promiseFromTemplate';

Object.assign(
    Observable,
    require('rxjs/observable/fromEvent'),
    require('rxjs/observable/combineLatest'),
    require('rxjs/observable/of'),
    require('rxjs/observable/fromPromise')
);


import {omit, without, mapValues} from 'lodash';


function createRandomString(length) {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
  return times(length, () => sample(chars)).join('');
}

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


function reduceToRemoteUrls(refs) {
  if (refs) {
    return Observable
        .fromEvent(refs.events.orderByKey(), 'value')
        .map(reduceEventSnapshotToActiveClipIds)
        .switchMap((activeClipIds) => (
          Observable.fromPromise(
            promiseFromTemplate(
              mapValues(activeClipIds, (clipId) => ({
                clipId: clipId,
                sources: formats.map((format) => ({
                  src: refs.videos.child(clipId + '.' + format).getDownloadURL(),
                  type: "video/" + format
                })),
                poster: refs.videos.child(clipId + '.png').getDownloadURL()
              }))
            )
          ).startWith({}) // Empty set while resolving URLs.
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

    this.addClip = function(note, blob) {
      // The clipId only needs to be unique per each user
      const clipId = createRandomString(6);

      localBlobs.next({note, blob, clipId});
    };

    this.clearClip = function(note) {
      clearActions.next(note);
      localBlobs.next({note, blob: null});
    };

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
