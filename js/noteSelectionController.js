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

type SelectionActions = {
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

type AuditionedNotes = {
  origin: NoteLocation,
  notes: ScheduledNoteList
};

type SelectionViewProps = {
  selectionState: SelectionState,
  selection: ?NoteSelection,
  auditioningNotes: ?AuditionedNotes
};

type SelectionProps = {
  onSongEdit: SongEdit => void,
  notes: ScheduledNoteList
};

type SelectionState = "normal" | "selecting" | "menu-prompt" | "auditioning";

function inRange(n: number, i: number, j: number) {
  const range = [i, j].sort();
  return n >= range[0] && n <= range[1];
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
export function selectionController(
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
  );

  //
  // Manage current selection
  //
  const selection$ = selectionState$
    .switchMap(state => {
      if (state === "selection") {
        return Observable.of(null).concat(actions.changeSelection$);
      } else {
        return Observable.of(null);
      }
    })
    .publishReplay();

  selection$.connect();

  //
  // Clear action
  //
  const clearEdits$ = this.actions.clearAction$
    .withLatestFrom(
      props$,
      selection$,
      (ignore, props: SelectionProps, selection: ?NoteSelection): ?SongEdit => {
        if (!selection) return null;

        const thisSelection = selection;

        const notes = props.notes
          .filter(note => isNoteInSelection(note, thisSelection))
          .map(tuple => ({ note: tuple[0], beat: tuple[1] }));

        return {
          action: "delete",
          notes: notes
        };
      }
    )
    .nonNull();

  clearEdits$.withLatestFrom(props$).subscribe(([action, props]) => {
    props.onSongEdit(action);
  });

  return combineTemplate({
    selectionState: selectionState$,
    auditioningNotes: Observable.of(null),
    selection: selection$
  });
}
