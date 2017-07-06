/* @flow */

import { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import type { Subject } from "rxjs/Subject";

import StorageSubject from "./StorageSubject";

import { concat, omit, findIndex, filter, identity, last } from "lodash";

type NoteSchedule = [string, number, number];

type Song = {
  bpm: number,
  notes: Array<NoteSchedule>,
  title: string,
  videoClips: {
    [string]: {
      videoClipId: string,
      trimStart: number,
      trimEnd: number,
      gain: number
    }
  }
};

type SongEdit =
  | { action: "change-bpm", bpm: number }
  | { action: "change-title", title: string }
  | {
      action: "add-video",
      videoClipId: string,
      note: string
    }
  | { action: "remove-video", note: string }
  | { action: "clear-all" }
  | { action: "replace-all", notes: Array<NoteSchedule> }
  | { action: "create", note: string, beat: number, duration: number }
  | { action: "delete", note: string, beat: number }
  | {
      action: "move",
      from: { note: string, beat: number },
      to: { note: string, beat: number }
    };

export function subjectFor(key: string, initialValue: Object) {
  return new StorageSubject(window.localStorage, key + "-2", initialValue);
}

export function updatesForNewSong(
  updateEvents$: Observable<SongEdit>,
  storage$: StorageSubject<Song>,
  subscription: Subscription
) {
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
  updateEvents$: Observable<SongEdit>,
  storage$: StorageSubject<Song>,
  subscription: Subscription
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

function reduceEditsToNotes(
  notes: Array<NoteSchedule>,
  edit: SongEdit
): Array<NoteSchedule> {
  function matcher(location: Object, note: NoteSchedule) {
    return note[0] === location.note && note[1] === location.beat;
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
          filter(notes, (v: NoteSchedule, i: number) => i !== index), // remove old note
          [[edit.to.note, edit.to.beat, oldDuration]] // add new note
        );
      } else {
        return notes;
      }
    default:
      return notes;
  }
}

// TODO: Update this to allow for changes to the trim and the gain
function reduceEditsToSong(song: Song, edit: SongEdit): Song {
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
          [edit.note]: {
            videoClipId: edit.videoClipId,
            trimStart: 0,
            trimEnd: 1,
            gain: 1
          }
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
