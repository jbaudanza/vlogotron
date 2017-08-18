/* @flow */

import { Observable } from "rxjs/Observable";
import { AnonymousSubject, Subject } from "rxjs/Subject";

const storageEvents$ = Observable.fromEvent(window, "storage");

/*
  Acts like a BehaviorSubject, but keeps state in localStorage, sessionStorage,
  or something that quacks like a Storage object.
*/
export default class StorageSubject<T> extends AnonymousSubject<T> {
  remoteUpdates$: Observable<T>;
  storageArea: Storage;
  key: string;

  clear: Function;

  constructor(storageArea: Storage, key: string, initialValue: T) {
    const serializeFn = JSON.stringify;
    const deserializeFn = JSON.parse;

    const subject$ = new Subject();

    const first$ = Observable.defer(function() {
      const value = storageArea.getItem(key);
      return Observable.of(value == null ? initialValue : deserializeFn(value));
    });

    const remoteUpdates$ = first$.concat(
      storageEvents$
        .filter(event => event.key === key && event.storageArea === storageArea)
        .map(event => deserializeFn(event.newValue))
    );

    const observer = {
      next(value) {
        storageArea.setItem(key, serializeFn(value));
        subject$.next(value);
      }
    };

    super(
      /* destination observer */
      // $FlowFixMe - Doesn't like duck-typed observer
      observer,
      /* source observable */
      Observable.merge(remoteUpdates$, subject$)
    );

    this.remoteUpdates$ = remoteUpdates$;
    this.storageArea = storageArea;
    this.key = key;

    this.clear = function() {
      subject$.complete();
      delete storageArea[key];
    };
  }
}
