import { Observable } from "rxjs/Observable";

import StorageSubject from "./StorageSubject";

import { concat, omit, findIndex, filter, identity, last } from "lodash";

export function subjectFor(key, initialValue) {
  return new StorageSubject(window.localStorage, key, initialValue);
}

export function updatesForNewSong(updateEvents$, storage$, subscription) {
  const accFn = reduceEditsToSong;

  subscription.add(
    updateEvents$
      .withLatestFrom(storage$, (i, acc) => accFn(acc, i))
      .subscribe(storage$)
  );
}

function withUndoStack(value) {
  return { current: value, undoStack: [], redoStack: [] };
}

export function updatesForNewSongWithUndo(
  updateEvents$,
  storage$,
  subscription
) {
  const accFn = reduceWithUndoStack;

  const undoState$ = storage$.remoteUpdates$
    .switchMap(song => {
      const initial = withUndoStack(song);
      const withUndoStack$ = updateEvents$.scan(accFn, initial);

      return withUndoStack$
        .do(o => storage$.next(o.current))
        .startWith(initial);
    })
    .publishReplay();

  subscription.add(undoState$.connect());

  return {
    undoEnabled$: undoState$.map(o => o.undoStack.length > 0),
    redoEnabled$: undoState$.map(o => o.redoStack.length > 0)
  };
}

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

function reduceEditsToNotes(notes, edit) {
  function matcher(edit, note) {
    return note[0] === edit.note && note[1] === edit.beat;
  }

  switch (edit.action) {
    case "clear-all":
      return [];
    case "replace-all":
      return edit.notes;
    case "create":
      return concat(notes, [[edit.note, edit.beat, edit.duration]]);
    case "delete":
      return filter(notes, note => !matcher(edit, note));
    case "move":
      const index = findIndex(notes, matcher.bind(null, edit.from));
      if (index !== -1) {
        const oldDuration = notes[index][2];
        return concat(
          filter(notes, (v, i) => i !== index), // remove old note
          [[edit.to.note, edit.to.beat, oldDuration]] // add new note
        );
      } else {
        return notes;
      }
    default:
      return notes;
  }
}

function reduceEditsToSong(song, edit) {
  switch (edit.action) {
    case "change-bpm":
      return { ...song, bpm: edit.bpm };
    case "change-title":
      return { ...song, title: edit.title };
    case "add-video":
      return {
        ...song,
        videoClips: {
          ...song.videoClips,
          [edit.note]: edit.videoClipId
        }
      };
    case "remove-video":
      return {
        ...song,
        videoClips: omit(song.videoClips, edit.note)
      };
    default:
      return {
        ...song,
        notes: reduceEditsToNotes(song.notes, edit)
      };
  }
}
