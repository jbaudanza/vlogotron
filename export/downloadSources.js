/* @flow */

// Run with:
//
//   ./node_modules/.bin/babel-node ./downloadSources.js
//

import { map } from "lodash";
import * as firebase from "firebase-admin";
import "../js/rxjs-additions";
import fs from "fs";
import { Observable } from "rxjs/Observable";

import type { VideoClip } from "../js/database";
import { findSongBoard, songForSongBoard } from "../js/database";
import { makeFilterGraphString } from "./makeFilterGraphString";
import { queryDurations } from "./queryDuration";

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

const DEFAULT_SONG_ID = "-KjtoXV7i2sZ8b_Azl1y";

//const songBoard$ = findSongBoard(firebase.database(), DEFAULT_SONG_ID);
// For offline use
const songBoard$ = Observable.of(require("./songboard.json"));

const bucket = firebase.storage().bucket("vlogotron-95daf.appspot.com");

function pathForClipId(clipId) {
  return `/video-clips/${clipId}.mp4`;
}

function downloadClipId(clipId) {
  const filename = `sources/video-${clipId}.mp4`;

  const exists = new Promise((resolve, reject) => {
    fs.exists(filename, resolve);
  });

  return exists.then(exists => {
    if (exists) {
      console.log(filename + " already exists");
    } else {
      console.log("Downloading " + filename);
      return bucket
        .file(pathForClipId(clipId))
        .download({ destination: filename });
    }
  });
}

songBoard$
  .switchMap(input => {
    const videoClipIds = Object.keys(input.videoClips).map(
      key => input.videoClips[key].videoClipId
    );
    return queryDurations(videoClipIds).then(durations => ({ durations }));
  })
  .debug("durations")
  .subscribe();

songBoard$
  .map(i => map(i.videoClips, j => j.videoClipId))
  .switchMap(list => Promise.all(list.map(downloadClipId)))
  .debug("test")
  .subscribe();
