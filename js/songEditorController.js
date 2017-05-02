import { Observable } from "rxjs/Observable";

import { playbackControllerHelper } from "./playbackController";
import { last } from "lodash";

import { songLengthInSeconds, reduceEditsToSong } from "./song";
import { readEvents, writeEvent } from "./localEventStore";
import { changeTitle } from './songUpdates';

const messages = require("messageformat-loader!json-loader!./messages.json");

function reduceWithUndoStack(acc, edit) {
  if (edit.action === "undo") {
    if (acc.undoStack.length === 0) {
      console.warn("processing redo action but redo stack is empty");
      return acc;
    }

    const next = last(acc.undoStack);

    return {
      current: next,
      undoStack: acc.undoStack.slice(0, -1),
      redoStack: acc.redoStack.concat([acc.current])
    };
  } else if (edit.action === "redo") {
    if (acc.redoStack.length === 0) {
      console.warn("processing redo action but redo stack is empty");
      return acc;
    }

    const next = last(acc.redoStack);

    return {
      current: next,
      undoStack: acc.undoStack.concat([acc.current]),
      redoStack: acc.redoStack.slice(0, -1)
    };
  } else {
    const next = reduceEditsToSong(acc.current, edit);

    return {
      current: next,
      undoStack: acc.undoStack.concat([acc.current]),
      redoStack: [] // Reset the redo stack when a new action occurs
    };
  }
}

const initialStateForUndoStack = {
  current: { notes: [], bpm: 120, title: messages["default-song-title"]() },
  undoStack: [],
  redoStack: []
};

export default function songEditorController(
  params,
  actions,
  currentUser$,
  media,
  subscription
) {
  subscription.add(actions.editSong$.subscribe(writeEvent));

  const editorState$ = readEvents()
    .mergeScan(
      (acc, stream$) => stream$.reduce(reduceWithUndoStack, acc),
      initialStateForUndoStack
    )
    .publishReplay();

  const notes$ = editorState$.map(o => o.current.notes);
  const bpm$ = editorState$.map(o => o.current.bpm).distinctUntilChanged();
  const undoEnabled$ = editorState$.map(o => o.undoStack.length > 0);
  const redoEnabled$ = editorState$.map(o => o.redoStack.length > 0);

  subscription.add(editorState$.connect());

  actions
    .changeTitle$
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
