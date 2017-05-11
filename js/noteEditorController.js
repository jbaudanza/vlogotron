import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import { playbackControllerHelper } from "./playbackController";
import { last } from "lodash";

import { songLengthInSeconds } from "./song";
import { readEvents, writeEvent } from "./localEventStore";

import { updatesForNewSong, updatesForNewSongWithUndo } from "./localWorkspace";

import { createSong, updateSong } from "./database";

export default function noteEditorController(
  params,
  actions,
  currentUser$,
  media,
  subscription,
  navigateFn
) {
  const undoEnabled$ = new BehaviorSubject(false);
  const redoEnabled$ = new BehaviorSubject(false);

  subscription.add(undoEnabled$);
  subscription.add(redoEnabled$);

  media.workspace$.subscribe(storage$ => {
    const undo = updatesForNewSongWithUndo(
      actions.editSong$,
      storage$,
      subscription
    );

    undo.redoEnabled$.subscribe(redoEnabled$);
    undo.undoEnabled$.subscribe(undoEnabled$);
  });

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const notes$ = media.song$.map(o => (o ? o.notes : []));

  const parentViewState$ = playbackControllerHelper(
    actions,
    currentUser$,
    notes$,
    media.song$.map(o => (o ? o.bpm : 120)).distinctUntilChanged(),
    media,
    subscription
  );

  // TODO:
  // - clear localStorage after a save
  actions.save$.withLatestFrom(media.song$, currentUser$).subscribe(([
    ignore,
    song,
    user
  ]) => {
    const promise = (song.songId ? updateSong(song) : createSong(song, user.uid))
    promise.then(key => navigateFn("/songs/" + key));
  });

  const saveEnabled$ = Observable.of(true).concat(actions.save$.mapTo(false));

  return Observable.combineLatest(
    parentViewState$,
    cellsPerBeat$,
    redoEnabled$,
    undoEnabled$,
    saveEnabled$,
    (parentViewState, cellsPerBeat, redoEnabled, undoEnabled, saveEnabled) => ({
      ...parentViewState,
      cellsPerBeat,
      redoEnabled,
      undoEnabled,
      saveEnabled,
      newSong: (!params.songId)
    })
  );
}
