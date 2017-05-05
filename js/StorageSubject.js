import { Observable } from "rxjs/Observable";
import { AnonymousSubject, Subject } from "rxjs/Subject";

const storageEvents$ = Observable.fromEvent(window, "storage");

/*
  Acts like a BehaviorSubject, but keeps state in localStorage, sessionStorage,
  or something that quacks like a Storage object.
*/
export default class StorageSubject extends AnonymousSubject {
  constructor(storageArea, key, initialValue) {
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
      observer,
      /* source observable */
      Observable.merge(remoteUpdates$, subject$)
    );

    this.remoteUpdates$ = remoteUpdates$;
  }
}
