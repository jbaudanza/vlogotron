import fs from "fs";
import { execFile } from "child_process";
import { makeFilterGraphString } from "./makeFilterGraphString";
import { fromPairs } from "lodash";

function readInput() {
  return new Promise((resolve, reject) => {
    fs.readFile("./input.json", function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
}

function filenameForVideoClip(videoClipId) {
  return `sources/video-${videoClipId}.mp4`;
}

function queryDuration(videoClipId) {
  return new Promise((resolve, reject) => {
    // Command line from http://trac.ffmpeg.org/wiki/FFprobeTips
    const child = execFile(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filenameForVideoClip(videoClipId)
      ],
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(parseFloat(stdout));
        }
      }
    );
  });
}

readInput()
  .then(input => {
    return Promise.all(
      Object.keys(input.videoClips).map(key => {
        const videoClipId = input.videoClips[key].videoClipId;
        return queryDuration(videoClipId).then(duration => [
          videoClipId,
          duration
        ]);
      })
    ).then(result =>
      Object.assign({}, input, { durations: fromPairs(result) })
    );
  })
  .then(input => {
    fs.writeFile(
      "filterscript",
      makeFilterGraphString(
        input.videoClips,
        input.song.bpm,
        input.song.notes,
        input.durations
      )
    );
  });
