/* @flow */

// Run with:
//
//   ./node_modules/.bin/babel-node ./downloadSources.js
//

import { map, flatten } from "lodash";
import * as firebase from "firebase-admin";
import "../js/rxjs-additions";
import fs from "fs";
import { Observable } from "rxjs/Observable";

import type { VideoClip } from "../js/database";
import { findSongBoard, songForSongBoard } from "../js/database";
import { makeFilterGraphString } from "./makeFilterGraphString";
import { queryDurations } from "./queryDuration";
import { execFile } from "child_process";

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

//const songBoard$ = findSongBoard(firebase.database(), DEFAULT_SONG_ID).take(1);
// For offline use
const songBoard$ = Observable.of(require("./songboard.json"));

const bucket = firebase.storage().bucket("vlogotron-95daf.appspot.com");

function remotePathForClipId(clipId) {
  return `/video-clips/${clipId}.mp4`;
}

function localPathForClipId(clipId) {
  return `sources/video-${clipId}.mp4`;
}

function downloadClipId(clipId) {
  const filename = localPathForClipId(clipId);

  const exists = new Promise((resolve, reject) => {
    fs.exists(filename, resolve);
  });

  return exists.then(exists => {
    if (exists) {
      console.log(filename + " already exists");
    } else {
      console.log("Downloading " + filename);
      return bucket
        .file(remotePathForClipId(clipId))
        .download({ destination: filename });
    }
  });
}

function downloadAllVideoClips() {
  return songBoard$
    .map(i => map(i.videoClips, j => j.videoClipId))
    .switchMap(list => Promise.all(list.map(downloadClipId)))
    .toPromise();
}

function argumentsForFfpmeg(videoClipIds, filterGraph) {
  return flatten(
    videoClipIds.map(id => ["-i", localPathForClipId(id)])
  ).concat([
    "-i",
    "sources/audio.wav",
    "-filter_complex",
    filterGraph,
    "-map",
    "[final]",
    "out.mp4"
  ]);
}

function execFFmpeg(cmdLineArguments: Array<string>): Promise<number> {
  return new Promise((resolve, reject) => {
    // Command line from http://trac.ffmpeg.org/wiki/FFprobeTips
    execFile("ffmpeg", cmdLineArguments, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(parseFloat(stdout));
      }
    });
  });
}

function renderSongBoardInFfmpeg() {
  return songBoard$
    .switchMap(input => {
      const videoClipIds = Object.keys(input.videoClips).map(
        key => input.videoClips[key].videoClipId
      );
      return queryDurations(videoClipIds).then(durations => {
        const song = songForSongBoard(input);
        const filterGraph = makeFilterGraphString(
          input.videoClips,
          song.bpm,
          song.notes,
          durations
        );

        return argumentsForFfpmeg(videoClipIds, filterGraph);
      });
    })
    .toPromise()
    .then(execFFmpeg);
}

downloadAllVideoClips()
  .then(renderSongBoardInFfmpeg)
  .then(() => process.exit());
