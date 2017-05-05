import { Observable } from "rxjs/Observable";

import { playbackControllerHelper } from "./playbackController";
import { last, mapKeys } from "lodash";

import { songLengthInSeconds, reduceEditsToSong } from "./song";
import { readEvents, writeEvent } from "./localEventStore";

import { updatesForNewSong, updatesForNewSongWithUndo } from "./localWorkspace";

import {navigate} from './router';

const messages = require("messageformat-loader!json-loader!./messages.json");

export default function noteEditorController(
  params,
  actions,
  currentUser$,
  media,
  subscription
) {
  // XXX: This only needs to return the undo state.
  const undoState$ = updatesForNewSongWithUndo(actions.editSong$, subscription);

  const undoEnabled$ = undoState$.map(o => o.undoStack.length > 0);
  const redoEnabled$ = undoState$.map(o => o.redoStack.length > 0);

  const cellsPerBeat$ = actions.changeCellsPerBeat$.startWith(4);

  const parentViewState$ = playbackControllerHelper(
    actions,
    currentUser$,
    media.song$.map(o => o.notes),
    media.song$.map(o => o.bpm).distinctUntilChanged(),
    media,
    subscription
  );

  // TODO:
  // - possible save snapshots into /events
  // - clear localStorage after a save
  actions.save$
    .withLatestFrom(media.song$, currentUser$, (ignore, song, user) =>
      Object.assign({}, song, { uid: user.uid })
    )
    .map(convertToFirebaseKeys)
    .subscribe(function(song) {
      const songsRef = firebase.database().ref("songs");
      songsRef.push(song).then(ref => navigate('/songs/' + ref.key));
    });

  const saveEnabled$ = Observable.of(true).concat(actions.save$.mapTo(false));

  return Observable.combineLatest(
    parentViewState$,
    cellsPerBeat$,
    redoEnabled$.startWith(false),
    undoEnabled$.startWith(false),
    saveEnabled$,
    (parentViewState, cellsPerBeat, redoEnabled, undoEnabled, saveEnabled) =>
      Object.assign({}, parentViewState, {
        cellsPerBeat,
        redoEnabled,
        undoEnabled,
        saveEnabled,
      })
  );
}

function convertToFirebaseKeys(song) {
  return Object.assign({}, song, {
    videoClips: mapKeys(song.videoClips, key => key.replace("#", "sharp"))
  })
}
