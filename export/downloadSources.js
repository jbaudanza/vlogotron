/* @flow */

// Run with:
//
//   ./node_modules/.bin/babel-node ./downloadSources.js
// 

import { map } from "lodash";
import * as firebase from "firebase-admin";
import "../js/rxjs-additions";

import promiseFromTemplate from "../js/promiseFromTemplate";

import type { VideoClip } from "../js/database";
import { findSongBoard, songForSongBoard } from "../js/database";

// XXX: Duplicated in VideoGrid.js
export const notes: Array<number> = [
  48, // C3
  50, // D3
  52, // E3
  53, // F3
  55, // G3
  57, // A3
  59, // B3
  60, // C4
  62, // D4
  64, // E4
  65, // F4
  67, // G4
  69, // A4
  71, // B4
  72, // C5
  74 // D5
];

const serviceAccount = require("../serviceAccountKey.json");
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://vlogotron-95daf.firebaseio.com"
});


const DEFAULT_SONG_ID = "-KjtoXV7i2sZ8b_Azl1y"


const songBoard$ = findSongBoard(firebase.database(), DEFAULT_SONG_ID);

const bucket = firebase.storage().bucket("vlogotron-95daf.appspot.com");

function pathForClipId(clipId) {
  return `/video-clips/${clipId}.mp4`;
}

function downloadClipId(clipId) { 
  return bucket.file(pathForClipId(clipId)).download({destination: `sources/video-${clipId}.mp4`})
}

songBoard$
    .map(i => map(i.videoClips, (j) => j.videoClipId))
    .switchMap(list => Promise.all(list.map(downloadClipId)))
    .debug('test')
    .subscribe()

//songBoard$.map(songForSongBoard).debug('test').subscribe()