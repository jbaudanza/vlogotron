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
  media,
  firebase,
  subscription,
  navigateFn
) {
  const currentUser$: Observable<?Firebase$User> = props$.map(
    props => props.currentUser
  );

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

  actions.save$
    .withLatestFrom(media.song$, currentUser$, media.workspace$)
    .subscribe(([ignore, song, user, workspace]) => {
      const promise = song.songId
        ? updateSong(firebase.database(), song)
        : createSong(firebase.database(), {
            ...song,
            uid: user.uid,
            visibility: "everyone"
          });
      promise.then(key => {
        navigateFn("/songs/" + key);
        workspace.clear();
      });
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
      newSong: params.remix || !params.songId
    })
  );
}
