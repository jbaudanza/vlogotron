/* @flow */

import { execFile } from "child_process";
import { fromPairs } from "lodash";

function filenameForVideoClip(videoClipId) {
  return `sources/video-${videoClipId}.mp4`;
}

export function queryDuration(videoClipId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Command line from http://trac.ffmpeg.org/wiki/FFprobeTips
    execFile(
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

function bindWithId(videoClipId): Promise<[string, number]> {
  return queryDuration(videoClipId).then(duration => [videoClipId, duration]);
}

export function queryDurations(
  videoClipIds: Array<string>
): Promise<{ [string]: number }> {
  return Promise.all(videoClipIds.map(bindWithId)).then(fromPairs);
}
