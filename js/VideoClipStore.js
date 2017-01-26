import {sample, times} from 'lodash';

import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/switchMap';

import createHistory from 'history/createBrowserHistory';


Object.assign(
    Observable,
    require('rxjs/observable/fromEvent'),
    require('rxjs/observable/combineLatest'),
    require('rxjs/observable/of')
);


import {omit, without, mapValues} from 'lodash';


function createRandomString(length) {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
  return times(length, () => sample(chars)).join('');
}

function reduceToUrls(acc, obj) {
  if (obj.blob) {
    return Object.assign({}, acc, {[obj.note]: URL.createObjectURL(obj.blob)});
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

const queue = firebase.database().ref('queue/tasks');

function refsForUids(uid) {
  return {
    database: firebase.database().ref('video-clips').child(uid),
    videos:   firebase.storage().ref('video-clips').child(uid),
    uploads:  firebase.storage().ref('uploads').child(uid),
    uid:      uid
  };
}

function noteToPath(note) {
  return note.replace('#', '-sharp')
}

function promiseFromTemplate(template) {
  return new Promise(function(resolve, reject) {
    const result = {};
    const keys = Object.keys(template);
    let count = keys.length;

    function callback(key, value) {
      result[key] = value;
      count--;
      if (count === 0) {
        resolve(result);
      }
    }

    keys.forEach(function(key) {
      const value = template[key];
      value.then(callback.bind(null, key), reject);
    });
  });
}

function mapToDownloadUrls(refs) {
  if (refs) {
    return Observable.fromEvent(refs.database, 'value')
      .switchMap((snapshot) => (
        promiseFromTemplate(
          mapValues(snapshot.val(), (value, key) => (
            refs.videos.child(key).getDownloadURL()
          ))
        )
      ));
  } else {
    return Promise.resolve({});
  }
}

// TODO:
//  - track the tasks somehow
//  - display upload progress to user
//  - make sure permissions are configured right
//  - URL.revokeObjectURL(url)    
export default class VideoClipStore {
  constructor() {
    const localBlobs = new Subject();
    const uploadTasks = new BehaviorSubject([]);
    const clearActions = new Subject();

    const remoteUrls = refs$.switchMap(mapToDownloadUrls).startWith({});

    this.addClip = function(note, blob) {
      localBlobs.next({note, blob});
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

      // The clipId only needs to be unique per each user
      const clipId = createRandomString(6);

      const uploadRef = refs.uploads.child(clipId);

      const task = uploadRef.put(change.blob);
      uploadTasks.next(uploadTasks._value.concat(task));

      task.then(function() {
        // XXX: This should be done by the transcoder
        //refs.database.child(noteToPath(change.note)).set(true);

        queue.push({
          note:   change.note,
          clipId: clipId,
          uid:    refs.uid
        });

        // XXX Trigger a transcoder task

        uploadTasks.next(without(uploadTasks._value, task))
      });
    });

    // TODO: This delete won't work
    Observable.combineLatest(refs$.filter((x) => x), clearActions)
      .subscribe(function([refs, note]) {
        refs.database.child(noteToPath(note)).remove();
        refs.videos.child(noteToPath(note)).delete();
      });

    const localUrls = currentRoute$.switchMap(function(route) {
      if (route.mode === 'record' && route.uid) {
        return localBlobs.scan(reduceToUrls, {}).startWith({});
      } else {
        return Observable.of({});
      }
    });

    this.urls = Observable.combineLatest(
        localUrls,
        remoteUrls,
        (local, remote) => Object.assign({}, remote, local)
    );
  }
}
