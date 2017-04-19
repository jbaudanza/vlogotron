import { Observable } from "rxjs/Observable";

import { playbackControllerHelper } from "./playbackController";
import { last } from "lodash";

import { songLengthInSeconds, reduceEditsToSong } from "./song";
import { readEvents, writeEvent } from "./localEventStore";

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
      redoStack: acc.redoStack
    };
  }
}

const initialStateForUndoStack = {
  current: [],
  undoStack: [],
  redoStack: []
};

export default function songEditorController(
  params,
  actions,
  currentUser$,
  subscription
) {
  subscription.add(actions.editSong$.subscribe(writeEvent));

  const editorState$ = readEvents()
    .mergeScan(
      (acc, stream$) =>
        stream$.reduce(reduceWithUndoStack, acc),
      initialStateForUndoStack
    )
    .publish();

  const notes$ = editorState$.map(o => o.current);
  const undoEnabled$ = editorState$.map(o => o.undoStack.length > 0);
  const redoEnabled$ = editorState$.map(o => o.redoStack.length > 0);

  subscription.add(editorState$.connect());

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
    redoEnabled$,
    undoEnabled$,
    (parentViewState, cellsPerBeat, redoEnabled, undoEnabled) =>
      Object.assign({}, parentViewState, { cellsPerBeat, redoEnabled, undoEnabled })
  );
}
