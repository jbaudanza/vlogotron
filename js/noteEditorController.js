import { Observable } from "rxjs/Observable";

import { playbackControllerHelper } from "./playbackController";
import { last, mapKeys } from "lodash";

import { songLengthInSeconds, reduceEditsToSong } from "./song";
import { readEvents, writeEvent } from "./localEventStore";

import { updatesForNewSong, updatesForNewSongWithUndo } from "./localWorkspace";

import messages from './messages';

export default function noteEditorController(
  params,
  actions,
  currentUser$,
  media,
  subscription,
  navigateFn
) {
  // XXX: This only needs to return the undo state.
  const undoState$ = updatesForNewSongWithUndo(actions.editSong$, subscription);

  const undoEnabled$ = undoState$.map(o => o.undoStack.length > 0);
  const redoEnabled$ = undoState$.map(o => o.redoStack.length > 0);

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const parentViewState$ = playbackControllerHelper(
    actions,
    currentUser$,
    media.song$.map(o => (o ? o.notes : [])),
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
    createSong(song, user.uid).then(key => navigateFn("/songs/" + key));
  });

  const saveEnabled$ = Observable.of(true).concat(actions.save$.mapTo(false));

  return Observable.combineLatest(
    parentViewState$,
    cellsPerBeat$,
    redoEnabled$.startWith(false),
    undoEnabled$.startWith(false),
    saveEnabled$,
    (parentViewState, cellsPerBeat, redoEnabled, undoEnabled, saveEnabled) => ({
      ...parentViewState,
      cellsPerBeat,
      redoEnabled,
      undoEnabled,
      saveEnabled
    })
  );
}

function createSong(song, uid) {
  const collectionRef = firebase.database().ref("songs");

  const rootObject = {
    title: song.title,
    visibility: "everyone",
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    uid
  };

  return collectionRef.push(rootObject).then(songRef => {
    songRef.child("revisions").push({
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      ...convertToFirebaseKeys(song),
      uid
    });

    return songRef.key;
  });
}

function convertToFirebaseKeys(song) {
  return {
    ...song,
    videoClips: mapKeys(song.videoClips, (value, key) =>
      key.replace("#", "sharp")
    )
  };
}
