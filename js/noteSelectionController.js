/* @flow */

import { Observable } from "rxjs/Observable";

import combineTemplate from "./combineTemplate";

import type { ScheduledNoteList, ScheduledNote } from "./song";
import type { SongEdit } from "./localWorkspace";

export type NoteLocation = {
  beat: number,
  note: number
};

export type NoteSelection = {
  start: NoteLocation,
  end: NoteLocation
};

export type SelectionActions = {
  // "normal" mode
  startSelection$: Observable<Object>, // From Header
  stopSelection$: Observable<Object>, // From Header or PianoRoll (Nevermind button)

  // In "selecting" mode
  changeSelection$: Observable<NoteSelection>, // From PianoRoll
  finishSelection$: Observable<Object>, // From PianoRoll

  // "menu-prompt" mode
  clearSelection$: Observable<Object>, // From PianoRoll
  copySelection$: Observable<Object>, // From PianoRoll

  // "auditioning" mode
  pasteSelection$: Observable<NoteLocation> // From PianoRoll
};

export type AuditionedNotes = {
  origin: NoteLocation,
  notes: ScheduledNoteList
};

export type SelectionViewProps = {
  selectionState: SelectionState,
  selection: ?NoteSelection,
  auditioningNotes: ?AuditionedNotes
};

type SelectionProps = {
  onSongEdit: SongEdit => void,
  notes: ScheduledNoteList
};

export type SelectionState =
  | "normal"
  | "selecting"
  | "menu-prompt"
  | "auditioning";

function inRange(n: number, i: number, j: number) {
  const range = [i, j].sort();
  return n >= range[0] && n <= range[1];
}

function topLeftCorner(selection: NoteSelection): NoteLocation {
  return {
    beat: Math.min(selection.start.beat, selection.end.beat),
    note: Math.max(selection.start.note, selection.end.note)
  };
}

function translateNotesForPasting(
  pasteLocation: NoteLocation,
  selection: AuditionedNotes
): Array<{ beat: number, note: number, duration: number }> {
  const noteOffset = pasteLocation.note - selection.origin.note;
  const beatOffset = pasteLocation.beat - selection.origin.beat;

  return selection.notes.map(tuple => ({
    note: tuple[0] + noteOffset,
    beat: tuple[1] + beatOffset,
    duration: tuple[2]
  }));
}

export function isNoteInSelection(
  note: ScheduledNote,
  selection: NoteSelection
): boolean {
  return (
    inRange(note[0], selection.start.note, selection.end.note) &&
    inRange(note[1], selection.start.beat, selection.end.beat)
  );
}

/*
  Handles all the actions and state management for selecting notes for clearing
  or copy and paste.
 */
export default function noteSelectionController(
  props$: Observable<SelectionProps>,
  actions: SelectionActions
): Observable<SelectionViewProps> {
  //
  // Manage selection state
  //
  const selectionState$ = Observable.merge(
    actions.startSelection$.mapTo("selecting"),
    Observable.merge(
      actions.clearSelection$,
      actions.stopSelection$,
      actions.pasteSelection$
    ).mapTo("normal"),
    actions.finishSelection$.mapTo("menu-prompt"),
    actions.copySelection$.mapTo("auditioning")
  ).startWith("normal");

  //
  // Manage current selection
  //
  const showSelection$ = selectionState$
    .map(state => state === "selecting" || state === "menu-prompt")
    .distinctUntilChanged();

  const selection$ = showSelection$
    .switchMap(shouldShow => {
      if (shouldShow) {
        return Observable.of(null).concat(actions.changeSelection$);
      } else {
        return Observable.of(null);
      }
    })
    .publishReplay();

  selection$.connect();

  function sampleSelectedNotes(when$) {
    return when$
      .withLatestFrom(
        props$,
        actions.changeSelection$,
        (ignore, props: SelectionProps, selection: ?NoteSelection) => {
          if (selection) {
            const thisSelection = selection;
            return [
              props.notes.filter(note =>
                isNoteInSelection(note, thisSelection)
              ),
              thisSelection
            ];
          } else {
            return null;
          }
        }
      )
      .nonNull();
  }

  //
  // Clear action
  //
  const clearEdits$ = sampleSelectedNotes(actions.clearSelection$).map(([
    notes,
    selection
  ]) => ({
    action: "delete",
    notes: notes.map(tuple => ({ note: tuple[0], beat: tuple[1] }))
  }));

  const mostRecentAuditionedNotes$ = sampleSelectedNotes(actions.copySelection$)
    .map(([notes, selection]) => ({
      origin: topLeftCorner(selection),
      notes: notes
    }))
    .startWith(null);

  const pasteEdits$ = actions.pasteSelection$.withLatestFrom(
    mostRecentAuditionedNotes$.nonNull(),
    (pasteLocation, selection) => {
      return {
        action: "create",
        notes: translateNotesForPasting(pasteLocation, selection)
      };
    }
  );

  const songEdits$ = Observable.merge(clearEdits$, pasteEdits$);

  songEdits$.withLatestFrom(props$).subscribe(([action, props]) => {
    props.onSongEdit(action);
  });

  const auditioningNotes$ = Observable.merge(
    mostRecentAuditionedNotes$,
    Observable.merge(
      actions.stopSelection$.mapTo(null),
      actions.pasteSelection$.mapTo(null)
    )
  );

  return combineTemplate({
    selectionState: selectionState$,
    auditioningNotes: auditioningNotes$,
    selection: selection$
  });
}
