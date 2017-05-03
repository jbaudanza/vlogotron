import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import { concat, omit, findIndex, filter, identity, last } from "lodash";

const messages = require("messageformat-loader!json-loader!./messages.json");

// TODO:
// - integrate added/cleared videos record events with note events
// - save into localStorage
// - read from localStorage

export function updatesForNewSong(updateEvents$, subscription) {
  return updatesForLocalStorage(
    "vlogotron-new-song",
    updateEvents$,
    initialSong,
    reduceEditsToSong,
    identity,
    identity,
    subscription
  );
}

function withUndoStack(value) {
  return {current: value, undoStack: [], redoStack: []};
}

export function updatesForNewSongWithUndo(updateEvents$, subscription) {
  return updatesForLocalStorage(
    "vlogotron-new-song",
    updateEvents$,
    initialSong,
    reduceWithUndoStack,
    (state) => state.current,
    withUndoStack,
    subscription
  );
}

// TODO: Should we just have this return a subject instead?
function updatesForLocalStorage(
  key,
  updateEvents$,
  initialValue,
  accFn,
  storeSelector,
  fetchSelector,
  subscription
) {
  const first$ = Observable.defer(function() {
    const value = window.localStorage.getItem(key);
    if (value == null) {
      return Observable.of(initialValue);
    } else {
      return Observable.of(JSON.parse(value));
    }
  });

  const remoteUpdates$ = first$.concat(
    Observable.fromEvent(window, "storage")
      .filter(
        event => event.key === key && event.storageArea === window.localStorage
      )
      .map(event => JSON.parse(event.newValue))
  ).map(fetchSelector);

  const acc$ = new BehaviorSubject();

  const localUpdates$ = updateEvents$.withLatestFrom(acc$, (i, acc) =>
    accFn(acc, i)
  );

  localUpdates$.subscribe(acc$);
  remoteUpdates$.subscribe(acc$);
  subscription.add(acc$);

  subscription.add(
    localUpdates$.subscribe(value =>
      window.localStorage.setItem(key, JSON.stringify(storeSelector(value)))
    )
  );

  return acc$.asObservable();
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
  bpm: 120,
  title: messages["default-song-title"]()
};

// XXX: Taken from song.js
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
  function update(obj) {
    return Object.assign({}, song, obj);
  }

  switch (edit.action) {
    case "change-bpm":
      return update({ bpm: edit.bpm });
    case "change-title":
      return update({ title: edit.title });
    case "add-video":
      return update({
        videoClips: Object.assign({}, song.videoClips, {
          [edit.note]: event.videoClipId
        })
      });
    case "remove-video":
      return update({ videoClips: omit(song.videoClips, edit.note) });
    default:
      return update({
        notes: reduceEditsToNotes(song.notes, edit)
      });
  }
}
