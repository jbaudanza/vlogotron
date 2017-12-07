import fs from "fs";
import { makeFilterGraphString } from "./makeFilterGraphString";
import { fromPairs } from "lodash";
import { queryDuration } from "./queryDuration";

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
