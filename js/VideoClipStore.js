import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/startWith';


import {omit} from 'lodash';

function reduceToUrls(acc, obj) {
  if (obj.blob) {
    return Object.assign({}, acc, {[obj.note]: URL.createObjectURL(obj.blob)});
  } else {
    return omit(acc, obj.note);
  }
}


export default class VideoClipStore {
  constructor() {
    const localBlobs = new Subject();

    this.addClip = function(note, blob) {
      localBlobs.next({note, blob});
    };

    // TODO: URL.revokeObjectURL(url)
    this.clearClip = function(note) {
      localBlobs.next({note, blob: null});
    };

    this.urls = localBlobs.scan(reduceToUrls, {}).startWith({});
  }
}
