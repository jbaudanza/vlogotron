import { Observable } from "rxjs/Observable";

import { playbackControllerHelper } from "./playbackController";
import { last } from "lodash";

import { songLengthInSeconds, reduceEditsToSong } from "./song";
import { readEvents, writeEvent } from "./localEventStore";
import { changeTitle } from "./songUpdates";

import { updatesForNewSong  } from "./localWorkspace";

const messages = require("messageformat-loader!json-loader!./messages.json");

export default function noteEditorController(
  params,
  actions,
  currentUser$,
  media,
  subscription
) {
  const editorState$ = updatesForNewSongWithUndo(
    actions.editSong$,
    subscription
  );

  const notes$ = editorState$.map(o => o.current.notes);
  const bpm$ = editorState$.map(o => o.current.bpm).distinctUntilChanged();
  const undoEnabled$ = editorState$.map(o => o.undoStack.length > 0);
  const redoEnabled$ = editorState$.map(o => o.redoStack.length > 0);

  actions.changeTitle$
    .withLatestFrom(media.songId$)
    .subscribe(function([title, songId]) {
      if (songId != null) {
        changeTitle(songId, title);
      }
    });

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const parentViewState$ = playbackControllerHelper(
    actions,
    currentUser$,
    notes$.startWith([]),
    bpm$.startWith(120),
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
