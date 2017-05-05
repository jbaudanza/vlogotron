import { Observable } from "rxjs/Observable";

import { playbackControllerHelper } from "./playbackController";
import { last } from "lodash";

import { songLengthInSeconds, reduceEditsToSong } from "./song";
import { readEvents, writeEvent } from "./localEventStore";

import { updatesForNewSong, updatesForNewSongWithUndo } from "./localWorkspace";

const messages = require("messageformat-loader!json-loader!./messages.json");

export default function noteEditorController(
  params,
  actions,
  currentUser$,
  media,
  subscription
) {
  // XXX: This only needs to return the undo state.
  const editorState$ = updatesForNewSongWithUndo(
    actions.editSong$,
    subscription
  );

  const undoEnabled$ = editorState$.map(o => o.undoStack.length > 0);
  const redoEnabled$ = editorState$.map(o => o.redoStack.length > 0);

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const parentViewState$ = playbackControllerHelper(
    actions,
    currentUser$,
    media.song$.map(o => o.notes),
    media.song$.map(o => o.bpm).distinctUntilChanged(),
    media,
    subscription
  );

  return Observable.combineLatest(
    parentViewState$,
    cellsPerBeat$,
    redoEnabled$.startWith(false),
    undoEnabled$.startWith(false),
    (parentViewState, cellsPerBeat, redoEnabled, undoEnabled) =>
      Object.assign({}, parentViewState, {
        cellsPerBeat,
        redoEnabled,
        undoEnabled
      })
  );
}
