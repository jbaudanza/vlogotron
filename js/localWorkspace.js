import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import StorageSubject from "./StorageSubject";

import { concat, omit, findIndex, filter, identity, last } from "lodash";

const subjects = {};

export function subjectFor(key, defaultSongTitle) {
  // TODO: Is putting these in a global variable the best way?
  if (!(key in subjects)) {
    subjects[key] = new StorageSubject(window.localStorage, key, {
      ...initialSong,
      title: defaultSongTitle
    });
  }

  return subjects[key];
}

export function updatesForNewSong(updateEvents$, subscription) {
  const key = "vlogotron-new-song";
  const accFn = reduceEditsToSong;

  const storage$ = subjectFor(key);

  subscription.add(
    updateEvents$
      .withLatestFrom(storage$, (i, acc) => accFn(acc, i))
      .subscribe(storage$)
  );

  return storage$.asObservable();
}

function withUndoStack(value) {
  return { current: value, undoStack: [], redoStack: [] };
}

export function updatesForNewSongWithUndo(updateEvents$, subscription) {
  const key = "vlogotron-new-song";
  const accFn = reduceWithUndoStack;

  const storage$ = subjectFor(key);

  return storage$.remoteUpdates$.switchMap(song => {
    const initial = withUndoStack(song);
    const withUndoStack$ = updateEvents$.scan(accFn, initial);

    return (
      withUndoStack$
        // TODO: This is going to be written once for every subscription
        .do(o => storage$.next(o.current))
        .startWith(initial)
    );
  });
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

const initialSong = {
  videoClips: {},
  notes: [],
  bpm: 120
};

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
