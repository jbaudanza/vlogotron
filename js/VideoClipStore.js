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

function mapToRoute(location, user) {
  let match;

  if (location.pathname === '/') {
    // TODO: Magic uid
    return {mode: 'playback', uid: 'b7Z6g5LFN7SiyJpAnxByRmuSHuV2'};
  } else if (location.pathname === '/record') {
    const obj = {mode: 'record'};
    if (user) {
      obj.uid = user.uid;
    } else {
      obj.uid = null;
      obj.overlay = 'login';
    }
    return obj;
  } else if (match = location.pathname.match(/\/u\/([\w-]+)/)) {
    return {mode: 'playback', uid: match[1]};
  } else {
    return {mode: 'not-found'};
  }
}


// XXX: Left off here. This should pull the uid out of the url
const refs$ = currentRoute$
  .map((route) => {
    if (route.uid)
      return refsForUids(route.uid)
    else
      return null;
  });


function refsForUids(uid) {
  return {
    database: firebase.database().ref('video-clips').child(uid),
    storage:  firebase.storage().ref('video-clips').child(uid)
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
            refs.storage.child(key).getDownloadURL()
          ))
        )
      ));
  } else {
    return Promise.resolve({});
  }
}

// TODO:
//  - make sure user is authenticated
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

      const storageRef = refs.storage.child(noteToPath(change.note));

      const task = storageRef.put(change.blob);
      uploadTasks.next(uploadTasks._value.concat(task));

      task.then(function() {
        refs.database.child(noteToPath(change.note)).set(true);

        uploadTasks.next(without(uploadTasks._value, task))
      });
    });

    Observable.combineLatest(refs$.filter((x) => x), clearActions)
      .subscribe(function([refs, note]) {
        refs.database.child(noteToPath(note)).remove();
        refs.storage.child(noteToPath(note)).delete();
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
