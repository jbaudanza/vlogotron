import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import StorageSubject from "./StorageSubject";

import { concat, omit, findIndex, filter, identity, last } from "lodash";

const messages = require("messageformat-loader!json-loader!./messages.json");

//const demoVideoClips = JSON.parse('{"C4":"-Kil0-yoMiv6MHClkkid","D4":"-Kil0Ge8UybL42MEk0VE","E4":"-Kil0PXJE2nuLWSBpVwg","F4":"-Kil0TMN9v14lJXaIi7i","F#4":"-Kil0kNVaTZxNJXRfEv4","G4":"-Kil0oQp03gPy6JiMXMi","G#4":"-Kil0wLi5KgHVwxEU3TK","A4":"-Kil1-XtoZT3H1Op23Tf","A#4":"-Kil13AfR5IJrojXCrWk","B4":"-Kil15_kUdPOL57NK-eg","C5":"-Kil1AOtU2zDQFpN0n-3","C#5":"-Kil1E5ssCvOQg3gtmbE","D5":"-Kil1Gmwx3k1LMqG-kzc","D#5":"-Kil1PvD-xuJ2JDx7AtW"}');

// TODO:
// - integrate added/cleared videos record events with note events
// - save into localStorage
// - read from localStorage

const subjects = {};

export function subjectFor(key) {
  // TODO: Is putting these in a global variable the best way?
  if (!(key in subjects)) {
    subjects[key] = new StorageSubject(window.localStorage, key, initialSong);
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
          [edit.note]: edit.videoClipId
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
