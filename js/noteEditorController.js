/* @flow */

import * as firebase from "firebase";

import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import { playbackControllerHelper } from "./playbackController";

import { readEvents, writeEvent } from "./localEventStore";

import {
  updatesForNewSong,
  updatesForNewSongWithUndo,
  subjectFor
} from "./localWorkspace";

import { createSong, updateSong, songForSongBoard } from "./database";

import type { Media } from "./mediaLoading";
import type { Subscription } from "rxjs/Subscription";

export default function noteEditorController(
  props$: Observable<Object>,
  actions: { [string]: Observable<any> },
  media: Media,
  subscription: Subscription
) {
  const unmount$ = props$.ignoreElements().concatWith(1);

  const currentUser$: Observable<?Firebase$User> = props$.map(
    props => props.currentUser
  );

  const undoEnabled$ = new BehaviorSubject(false);
  const redoEnabled$ = new BehaviorSubject(false);

  subscription.add(undoEnabled$);
  subscription.add(redoEnabled$);

  // TODO: Initial value probably isn't right
  const workspace$ = media.songBoard$
    .map(songBoard =>
      subjectFor("vlogotron-workspace" + songBoard.songBoardId, {})
    )
    .takeUntil(unmount$)
    .publishReplay();

  workspace$.connect();

  workspace$.subscribe(storage$ => {
    const undo = updatesForNewSongWithUndo(
      actions.editSong$,
      storage$,
      subscription
    );

    undo.redoEnabled$.subscribe(redoEnabled$);
    undo.undoEnabled$.subscribe(undoEnabled$);
  });

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const song$ = media.songBoard$.map(songForSongBoard);

  const parentViewState$ = playbackControllerHelper(
    actions,
    currentUser$,
    song$.map(o => o.notes),
    song$.map(o => o.bpm).distinctUntilChanged(),
    media,
    subscription
  );

  actions.save$
    .withLatestFrom(media.songBoard$, currentUser$, workspace$, (a, b, c) => [
      a,
      b,
      c
    ])
    .subscribe(([ignore, songBoard, user, workspace]) => {
      // TOOD: Update the firebase database here
      const key = "something";
      promise.then(key => {
        navigateFn("/songs/" + key);
        workspace.clear();
      });
    });

  const saveEnabled$ = Observable.of(true).concat(actions.save$.mapTo(false));

  return Observable.combineLatest(
    props$,
    parentViewState$,
    cellsPerBeat$,
    redoEnabled$,
    undoEnabled$,
    saveEnabled$,
    (
      props,
      parentViewState,
      cellsPerBeat,
      redoEnabled,
      undoEnabled,
      saveEnabled
    ) => ({
      ...parentViewState,
      cellsPerBeat,
      redoEnabled,
      undoEnabled,
      saveEnabled,
      location: props.location
    })
  );
}
