import { Observable } from "rxjs/Observable";

import { playbackControllerHelper } from "./playbackController";
import { last } from "lodash";

import { songLengthInSeconds } from "./song";
import { readEvents, writeEvent } from "./localEventStore";

import { updatesForNewSong, updatesForNewSongWithUndo } from "./localWorkspace";

import { createSong } from "./database";

export default function noteEditorController(
  params,
  actions,
  currentUser$,
  media,
  subscription,
  navigateFn
) {
  // XXX: This only needs to return the undo state.
  const undoState$ = updatesForNewSongWithUndo(actions.editSong$, subscription);

  const undoEnabled$ = undoState$.map(o => o.undoStack.length > 0);
  const redoEnabled$ = undoState$.map(o => o.redoStack.length > 0);

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const parentViewState$ = playbackControllerHelper(
    actions,
    currentUser$,
    media.song$.map(o => (o ? o.notes : [])),
    media.song$.map(o => (o ? o.bpm : 120)).distinctUntilChanged(),
    media,
    subscription
  );

  // TODO:
  // - clear localStorage after a save
  actions.save$.withLatestFrom(media.song$, currentUser$).subscribe(([
    ignore,
    song,
    user
  ]) => {
    createSong(song, user.uid).then(key => navigateFn("/songs/" + key));
  });

  const saveEnabled$ = Observable.of(true).concat(actions.save$.mapTo(false));

  return Observable.combineLatest(
    parentViewState$,
    cellsPerBeat$,
    redoEnabled$.startWith(false),
    undoEnabled$.startWith(false),
    saveEnabled$,
    (parentViewState, cellsPerBeat, redoEnabled, undoEnabled, saveEnabled) => ({
      ...parentViewState,
      cellsPerBeat,
      redoEnabled,
      undoEnabled,
      saveEnabled
    })
  );
}
