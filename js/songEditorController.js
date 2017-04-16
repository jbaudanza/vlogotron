import { Observable } from "rxjs/Observable";

import {playbackControllerHelper} from "./playbackController";

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

  const notes$ = readEvents()
    .mergeScan((acc, stream$) => stream$.reduce(reduceEditsToSong, acc), [])
    .publish();

  subscription.add(notes$.connect());

  return playbackControllerHelper(
    { uid: "b7Z6g5LFN7SiyJpAnxByRmuSHuV2" },
    actions,
    currentUser$,
    notes$,
    subscription
  );
}
