import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

const request = window.indexedDB.open("vlogotron", 1);
request.onupgradeneeded = onUpgradeNeeded;

const dbPromise = promiseFromIDBRequest(request);

const dbWrites$ = new Subject();

// This observable will send signals when it would be a good idea to read
// the database to check for more events.
const readSignals$ = Observable.merge(
  Observable.of({}),
  dbWrites$,
  // Poll periodically, in case there is another tab making edits.
  Observable.interval(60 * 1000)
);

export function writeEvent(event) {
  const p = dbPromise.then(db => {
    const transaction = db.transaction(["song-edits"], "readwrite");

    const objectStore = transaction.objectStore("song-edits");

    return promiseFromIDBRequest(objectStore.add(event));
  });

  p.then(r => dbWrites$.next(r));

  return p;
}

export function readEvents() {
  // WARNING: All subscriptions are going to use the same subject. So we must
  // be careful to only subscribe once. I would like to refactor this to come
  // up with something better.
  const lastId$ = new BehaviorSubject(0);

  /*
  Alternative suggestions from @dorus:

    source.publish(source_ => notifier.switchMap(a => source_.take(1), (a,b) => ({a,b}))) would work too.
    source.combineLatest(notifier, (a,b)=>({a,b})).distinctUntilKeyChanged('a').distinctUntilKeyChanged('b')
  */
  // TODO: Make sure this handles the case where the database doesn't return any
  // results for a read signal.
  return Observable.combineLatest(
    readSignals$.scan(i => i + 1, 0), // count read signals
    lastId$,
    dbPromise,
    (signalCounter, lastId, db) => ({ signalCounter, lastId, db })
  )
    .mergeScan(function(acc, state) {
      if (shouldEmit(acc, state)) {
        return Observable.of(state);
      } else {
        return Observable.empty();
      }
    })
    .map(state => {
      const results$ = queryEvents(state.db, state.lastId);
      results$
        .map(cursor => cursor.key)
        .last(
          null /*predicate - unused */,
          null /*resultSelector - unused */,
          null /*defaultValue - this is the one we care about making null*/
        )
        .filter(x => x != null)
        .subscribe(x => lastId$.next(x));

      return results$;
    })
    .mergeAll()
    .map(cursor => cursor.value);
}

function shouldEmit(lastEmit, currentState) {
  return (
    lastEmit == null ||
    (currentState.signalCounter > lastEmit.signalCounter &&
      currentState.lastId > lastEmit.lastId)
  );
}

function queryEvents(db, startKey) {
  const transaction = db.transaction(["song-edits"]);
  const objectStore = transaction.objectStore("song-edits");

  let range;
  if (startKey) {
    range = IDBKeyRange.lowerBound(startKey, true); // true = exclude startKey
  }

  const results$ = observableFromIDBRequest(objectStore.openCursor(range))
    .takeWhile(cursor => {
      if (cursor) {
        cursor.continue();
        return true;
      } else {
        return false;
      }
    })
    .publish();

  results$.connect();

  return results$;
}

function observableFromIDBRequest(request) {
  return Observable.create(observer => {
    request.addEventListener("success", () => observer.next(request.result));
    request.addEventListener("error", error => observer.error(error));
  });
}

function promiseFromIDBRequest(request) {
  return new Promise(function(resolve, reject) {
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
}

function onUpgradeNeeded(event) {
  const db = event.target.result;
  const objectStore = db.createObjectStore("song-edits", {
    autoIncrement: true
  });
}
