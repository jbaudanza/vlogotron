import { Observable } from "rxjs/Observable";

import playbackController from "./playbackController";

import { songLengthInSeconds, reduceEditsToSong } from "./song";
import { readEvents, writeEvent } from "./localEventStore";

export default function songEditorController(
  params,
  actions,
  currentUser$,
  subscription
) {
  const dbWrites$ = actions.editSong$;

  subscription.add(dbWrites$.subscribe(writeEvent));

  // TODO: pass this to the view somehow
  const notes$ = readEvents().mergeScan((acc, stream$) => (
    stream$.reduce(reduceEditsToSong, acc)
  ), []).publish();

  subscription.add(notes$.connect());

  const parentViewState$ = playbackController(
    { uid: "b7Z6g5LFN7SiyJpAnxByRmuSHuV2" },
    actions,
    currentUser$,
    subscription
  );

  return Observable.combineLatest(parentViewState$, notes$, (state, notes) =>
    Object.assign({}, state, { notes })
  );
}
