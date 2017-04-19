import { Observable } from "rxjs/Observable";

import { playbackControllerHelper } from "./playbackController";

import { songLengthInSeconds, reduceEditsToSong } from "./song";
import { readEvents, writeEvent } from "./localEventStore";

export default function songEditorController(
  params,
  actions,
  currentUser$,
  subscription
) {

  const allEdits$ = Observable.merge(
    actions.editSong$,
    actions.chooseSong$.map(action => ({
      action: 'replace-all',
      notes: action.notes
    }))
  );

  subscription.add(allEdits$.subscribe(writeEvent));

  const notes$ = readEvents()
    .mergeScan((acc, stream$) => stream$.reduce(reduceEditsToSong, acc), [])
    .publish();

  subscription.add(notes$.connect());

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const parentViewState$ = playbackControllerHelper(
    { uid: "b7Z6g5LFN7SiyJpAnxByRmuSHuV2" },
    actions,
    currentUser$,
    notes$,
    subscription
  );

  return Observable.combineLatest(
    parentViewState$,
    cellsPerBeat$,
    (parentViewState, cellsPerBeat) =>
      Object.assign({}, parentViewState, { cellsPerBeat })
  );
}
