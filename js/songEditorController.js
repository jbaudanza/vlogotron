import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import playbackController from "./playbackController";

import { songLengthInSeconds, reduceEditsToSong } from "./song";

function fromIDBRequest(request) {
  return Observable.create(observer => {
    request.addEventListener("success", () => observer.next(request.result));
    request.addEventListener("error", error => observer.error(error));
  });
}

function queryEvents(db, startKey) {
  const transaction = db.transaction(["song-edits"]);
  const objectStore = transaction.objectStore("song-edits");

  let range;
  if (startKey) {
    range = IDBKeyRange.lowerBound(startKey, true); // true = exclude startKey
  }

  return fromIDBRequest(objectStore.openCursor(range)).takeWhile(cursor => {
    if (cursor) {
      cursor.continue();
      return true;
    } else {
      return false;
    }
  });
}

function onUpgradeNeeded(event) {
  const db = event.target.result;
  const objectStore = db.createObjectStore("song-edits", {
    autoIncrement: true
  });
}

export default function songEditorController(
  params,
  actions,
  currentUser$,
  subscription
) {
  const request = window.indexedDB.open("testdb", 3);
  request.onupgradeneeded = onUpgradeNeeded;

  const db$ = fromIDBRequest(request).first();

  const dbWrites$ = actions.editSong$
    .withLatestFrom(db$, (edit, db) => {
      const transaction = db.transaction(["song-edits"], "readwrite");
      //    transaction.oncomplete = () => console.log('transaction complete')

      const objectStore = transaction.objectStore("song-edits");

      return objectStore.add(edit);
    })
    .flatMap(req => fromIDBRequest(req).first())
    .debug("write")
    .publish();

  const readSignals$ = Observable.merge(
    Observable.of({}),
    dbWrites$,
    Observable.interval(60 * 1000)
  ).debug("read-signal");

  const lastId$ = new BehaviorSubject(0);

  const dbReads$ = Observable.combineLatest(
    db$,
    readSignals$,
    (db, ignore) => db
  )
    .withLatestFrom(lastId$, (db, lastId) =>
      queryEvents(db, lastId).do(cursor => lastId$.next(cursor.key))
    )
    .mergeAll();

  dbReads$
    //.map(cursor => cursor.value)
    //.scan(reduceEditsToSong, [])
    .debug("song")
    .subscribe();

  subscription.add(dbWrites$.connect());

  const parentViewState$ = playbackController(
    { uid: "b7Z6g5LFN7SiyJpAnxByRmuSHuV2" },
    actions,
    currentUser$,
    subscription
  );

  return parentViewState$.map(state => Object.assign({}, state, { notes: [] }));
}
