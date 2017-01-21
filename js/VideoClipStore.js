import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/switchMap';

Object.assign(
    Observable,
    require('rxjs/observable/fromEvent'),
    require('rxjs/observable/combineLatest')
);


import {omit, without, mapValues} from 'lodash';

function reduceToUrls(acc, obj) {
  if (obj.blob) {
    return Object.assign({}, acc, {[obj.note]: URL.createObjectURL(obj.blob)});
  } else {
    return omit(acc, obj.note);
  }
}

const currentUser$ = Observable.create(function(observer) {
  firebase.auth().onAuthStateChanged((user) => observer.next(user));
});

const refs$ = currentUser$
  .filter((x) => x)
  .map((user) => ({
    database: firebase.database().ref('video-clips').child(user.uid),
    storage:  firebase.storage().ref('video-clips').child(user.uid)
  }));

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
  return Observable.fromEvent(refs.database, 'value')
    .switchMap((snapshot) => (
      promiseFromTemplate(
        mapValues(snapshot.val(), (value, key) => (
          refs.storage.child(key).getDownloadURL()
        ))
      )
    ));
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

    uploadTasks.subscribe(function(list) {
      console.log('list', list);
    });

    this.addClip = function(note, blob) {
      localBlobs.next({note, blob});
    };

    this.clearClip = function(note) {
      clearActions.next(note);
      localBlobs.next({note, blob: null});
    };

    localBlobs.subscribe(function(obj) {
      if (!obj.blob)
        return;

      // TODO: use currentUser$ stream
      const storageRef = firebase.storage().ref()
          .child('video-clips')
          .child(firebase.auth().currentUser.uid)
          .child(noteToPath(obj.note));

      const task = storageRef.put(obj.blob);
      uploadTasks.next(uploadTasks._value.concat(task));

      task.then(function() {
        firebase.database().ref('video-clips')
            .child(firebase.auth().currentUser.uid)
            .child(noteToPath(obj.note)).set(true);

        uploadTasks.next(without(uploadTasks._value, task))
      });
    });

    Observable.combineLatest(refs$, clearActions)
      .subscribe(function([refs, note]) {
        refs.database.child(noteToPath(note)).remove();
        refs.storage.child(noteToPath(note)).delete();
      });

    const localUrls = localBlobs.scan(reduceToUrls, {}).startWith({});

    this.urls = Observable.combineLatest(
        localUrls,
        remoteUrls,
        (local, remote) => Object.assign({}, remote, local)
    );
  }
}
