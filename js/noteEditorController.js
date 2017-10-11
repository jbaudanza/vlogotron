/* @flow */

import * as firebase from "firebase";

import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import { playbackControllerHelper } from "./playbackController";
import { songBoardPath } from "./router";

import {
  updatesForNewSongWithUndo,
  songForLocalWorkspace,
  subjectFor
} from "./localWorkspace";

import { updateSongBoard } from "./database";

import { songs } from "./song";
import type { Media } from "./mediaLoading";
import type { LocalWorkspace } from "./localWorkspace";
import type { Subscription } from "rxjs/Subscription";

type Props = {
  onNavigate: string => void,
  currentUser: Firebase$User,
  location: Location,
  premiumAccountStatus: boolean
};

export default function noteEditorController(
  props$: Observable<Props>,
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

  const workspace$ = media.songBoard$
    .map(songBoard =>
      subjectFor("vlogotron-workspace-3" + songBoard.songBoardId, {
        songId: songBoard.songId,
        customSong: songBoard.customSong
      })
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

    actions.save$
      .withLatestFrom(
        media.songBoard$,
        storage$,
        currentUser$.nonNull(),
        props$,
        (ignore, a, b, c, d) => [a, b, c, d]
      )
      .subscribe(([songBoard, snapshot, user, props]) => {
        const event = {
          type: "update-song",
          songId: snapshot.songId,
          customSong: snapshot.customSong,
          uid: user.uid
        };

        updateSongBoard(
          firebase.database(),
          songBoard.songBoardId,
          event
        ).then(() => {
          props.onNavigate(songBoardPath(songBoard.songBoardId));
          storage$.clear();
        });
      });

    undo.redoEnabled$.subscribe(redoEnabled$);
    undo.undoEnabled$.subscribe(undoEnabled$);
  });

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const song$ = workspace$.switchMap(workspace =>
    workspace.map(songForLocalWorkspace)
  );

  const parentViewState$ = playbackControllerHelper(
    actions,
    currentUser$,
    song$.map(o => o.notes),
    song$.map(o => o.bpm).distinctUntilChanged(),
    media,
    subscription
  );

  const saveEnabled$ = Observable.of(true).concat(actions.save$.mapTo(false));

  // $FlowFixMe - using too many arguments for combineLatest
  return Observable.combineLatest(
    props$,
    parentViewState$,
    cellsPerBeat$,
    redoEnabled$,
    undoEnabled$,
    saveEnabled$,
    currentUser$,
    media.songBoard$,
    (
      props,
      parentViewState,
      cellsPerBeat,
      redoEnabled,
      undoEnabled,
      saveEnabled,
      currentUser,
      songBoard
    ) => ({
      ...parentViewState,
      cellsPerBeat,
      redoEnabled,
      undoEnabled,
      saveEnabled,
      currentUser,
      songBoardId: songBoard.songBoardId,
      location: props.location,
      premiumAccountStatus: props.premiumAccountStatus,
      onNavigate: props.onNavigate
    })
  );
}
