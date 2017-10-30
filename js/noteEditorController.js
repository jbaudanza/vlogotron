/* @flow */

import * as firebase from "firebase";

import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Subject } from "rxjs/Subject";

import { playbackControllerHelper } from "./playbackController";
import { songBoardPath } from "./router";

import {
  updatesForNewSongWithUndo,
  songForLocalWorkspace,
  subjectFor
} from "./localWorkspace";

import noteSelectionController from "./noteSelectionController";

import { updateSongBoard } from "./database";
import combineTemplate from "./combineTemplate";

import { songs } from "./song";
import type { Media, NoteConfiguration } from "./mediaLoading";
import type { LocalWorkspace, SongEdit } from "./localWorkspace";
import type { Subscription } from "rxjs/Subscription";
import type { ScheduledNoteList } from "./song";
import type { PlaybackViewProps } from "./playbackController";
import type {
  SelectionViewProps,
  SelectionActions
} from "./noteSelectionController";

type Props = {
  onNavigate: string => void,
  onLogin: Function,
  currentUser: ?Firebase$User,
  location: Location,
  premiumAccountStatus: boolean
};

type LocalViewProps = {
  onNavigate: string => void,
  location: Object,
  songTitle: string,
  saveEnabled: boolean,
  onLogin: Function,
  songBoardId: string,
  songLength: number,
  cellsPerBeat: number,
  undoEnabled: boolean,
  redoEnabled: boolean,
  premiumAccountStatus: boolean,
  currentUser: ?Firebase$User
};

export type ViewProps = LocalViewProps & PlaybackViewProps & SelectionViewProps;

type Actions = {
  changeCellsPerBeat$: Observable<number>,
  save$: Observable<Object>,
  editSong$: Observable<SongEdit>
};

export default function noteEditorController(
  props$: Observable<Props>,
  actions: Actions & SelectionActions,
  media: Media,
  subscription: Subscription
): Observable<ViewProps> {
  const unmount$ = props$.ignoreElements().concatWith(1);

  const currentUser$: Observable<?Firebase$User> = props$.map(
    props => props.currentUser
  );

  const undoEnabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  const redoEnabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);

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

  const editSong$ = new Subject();
  actions.editSong$.subscribe(editSong$);

  workspace$.subscribe(storage$ => {
    const undo = updatesForNewSongWithUndo(editSong$, storage$, subscription);

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

  const notes$ = song$.map(o => o.notes);

  // TODO: Uncomment this line to reproduce performance issues with rendering
  // the selection rectangle.
  //const notes$ = Observable.of([[59, 174, 0.13]]);

  const playbackProps$ = playbackControllerHelper(
    actions,
    notes$,
    song$.map(o => o.bpm).distinctUntilChanged(),
    media,
    subscription
  );

  const saveEnabled$ = Observable.of(true).concat(actions.save$.mapTo(false));

  const localProps$ = combineTemplate({
    cellsPerBeat: cellsPerBeat$,
    redoEnabled: redoEnabled$,
    undoEnabled: undoEnabled$,
    saveEnabled: saveEnabled$,
    songBoardId: media.songBoard$.map(songBoard => songBoard.songBoardId)
  });

  const selectionProps$ = noteSelectionController(
    notes$.map(notes => ({
      notes: notes,
      onSongEdit: action => {
        editSong$.next(action);
      }
    })),
    actions
  );

  return Observable.combineLatest(
    playbackProps$,
    localProps$,
    selectionProps$,
    props$,
    (playbackProps, localProps, selectionProps, props) => ({
      ...playbackProps,
      ...localProps,
      ...selectionProps,
      location: props.location,
      premiumAccountStatus: props.premiumAccountStatus,
      onNavigate: props.onNavigate,
      onLogin: props.onLogin,
      currentUser: props.currentUser
    })
  );
}
