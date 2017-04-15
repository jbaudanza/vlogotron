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
  // There's probably a less-imperative way to write this, but I just want to
  // get it working. Here are some suggestions from @dorus:
  //  source.publish(source_ => notifier.switchMap(a => source_.take(1), (a,b) => ({a,b}))) would work too.
  //  source.combineLatest(notifier, (a,b)=>({a,b})).distinctUntilKeyChanged('a').distinctUntilKeyChanged('b')
  return Observable.create(function(observer) {
    let inFlight = false;
    let shouldQueryAfterFlight = false;
    let lastId = null;

    function go(db) {
      const results$ = queryEvents(db, lastId);
      inFlight = true;

      results$
        .map(cursor => cursor.key)
        .last(
          null /*predicate - unused */,
          null /*resultSelector - unused */,
          null /*defaultValue - this is the one we care about making null*/
        )
        .subscribe({
          next(id) {
            inFlight = false;

            if (id !== null) {
              lastId = id;
            }
            if (shouldQueryAfterFlight) {
              shouldQueryAfterFlight = false;
              go(db);
            }
          },
          error(e) {
            observer.error(e);
          }
        });

      // TODO: consider emitting an array instead of an Observable. don't need to be fancy
      observer.next(results$.map(cursor => cursor.value));
    }

    return Observable.combineLatest(
      dbPromise,
      readSignals$,
      (db, ignore) => db
    ).subscribe({
      next(db) {
        if (inFlight) {
          shouldQueryAfterFlight = true;
        } else {
          go(db);
        }
      },
      error(e) {
        observer.error(e);
      }
    });
  });
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
