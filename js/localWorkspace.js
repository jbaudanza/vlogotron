/* @flow */

import { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import type { Subject } from "rxjs/Subject";
import {
  concat,
  omit,
  merge,
  findIndex,
  find,
  filter,
  identity,
  last
} from "lodash";

import StorageSubject from "./StorageSubject";

import { songs } from "./song";
import type { SongId, Song, ScheduledNoteList, ScheduledNote } from "./song";

type NoteLocation = {
  beat: number,
  note: number
};

export type SongEdit =
  | { action: "undo" }
  | { action: "redo" }
  | { action: "change-bpm", bpm: number }
  | { action: "change-title", title: string }
  | { action: "update-song", songId: SongId }
  | { action: "clear-all" }
  | { action: "replace-all", notes: ScheduledNoteList }
  | {
      action: "create",
      notes: Array<{
        note: number,
        beat: number,
        duration: number,
        velocity: number
      }>
    }
  | { action: "delete", notes: Array<NoteLocation> }
  | {
      action: "move",
      from: NoteLocation,
      to: NoteLocation
    };

export type LocalWorkspace = {
  songId: SongId,
  customSong?: Song
};

export function subjectFor(
  key: string,
  initialValue: Object
): StorageSubject<Object> {
  return new StorageSubject(window.localStorage, key + "-2", initialValue);
}

export function updatesForNewSong(
  updateEvents$: Observable<SongEdit>,
  storage$: StorageSubject<LocalWorkspace>,
  subscription: Subscription
) {
  const accFn = reduceEditsToWorkspace;

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
  storage$: StorageSubject<LocalWorkspace>,
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
    const next = reduceEditsToWorkspace(acc.current, edit);

    return {
      current: next,
      undoStack: acc.undoStack.concat([acc.current]),
      redoStack: [] // Reset the redo stack when a new action occurs
    };
  }
}

function reduceEditsToNotes(
  notes: ScheduledNoteList,
  edit: SongEdit
): ScheduledNoteList {
  function matcher(location: NoteLocation, note: ScheduledNote) {
    return note[0] === location.note && note[1] === location.beat;
  }

  switch (edit.action) {
    case "clear-all":
      return [];
    case "replace-all":
      return edit.notes;
    case "create":
      return concat(
        notes,
        edit.notes.map(o => [o.note, o.beat, o.duration, o.velocity])
      );
    case "delete":
      const removedNotes = edit.notes;
      return filter(notes, i => !find(removedNotes, j => matcher(j, i)));
    case "move":
      const index = findIndex(notes, matcher.bind(null, edit.from));
      if (index !== -1) {
        const oldDuration = notes[index][2];
        return concat(
          filter(notes, (v: ScheduledNote, i: number) => i !== index), // remove old note
          [[edit.to.note, edit.to.beat, oldDuration]] // add new note
        );
      } else {
        return notes;
      }
    default:
      return notes;
  }
}

function reduceEditsToSong(song: Song, edit: SongEdit): Song {
  switch (edit.action) {
    case "change-bpm":
      return { ...song, bpm: edit.bpm };
    case "change-title":
      return { ...song, title: edit.title };
    default:
      return {
        ...song,
        notes: reduceEditsToNotes(song.notes, edit)
      };
  }
}

// TODO: This is exactly the same as database.songForSongBoard, but with
// a different datastructure. This is a code smell.
export function songForLocalWorkspace(workspace: LocalWorkspace): Song {
  if (workspace.customSong && workspace.songId === "custom") {
    return workspace.customSong;
  } else {
    return songs[workspace.songId];
  }
}

function reduceEditsToWorkspace(
  workspace: LocalWorkspace,
  edit: SongEdit
): LocalWorkspace {
  if (edit.action === "update-song") {
    return { songId: edit.songId };
  } else {
    return {
      songId: "custom",
      customSong: reduceEditsToSong(songForLocalWorkspace(workspace), edit)
    };
  }
}
