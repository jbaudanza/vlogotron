const fs = require("fs");
const { execFile } = require("child_process");

const midiNotesInGrid = [
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

function isSharp(midiNote) {
  return [1, 3, 6, 8, 10].indexOf(midiNote % 12) != -1;
}

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

function escapeFilter(str) {
  return str.replace(/,/g, "\\,");
}

function realizedMidiNote(midiNote) {
  if (isSharp(midiNote)) {
    return midiNote - 1;
  } else {
    return midiNote;
  }
}

function beatsToTimestamp(beats, bpm) {
  return beats / bpm * 60;
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

function makeObject(keyValuesList) {
  return keyValuesList.reduce(
    (acc, [key, value]) => Object.assign({}, acc, { [key]: value }),
    {}
  );
}

function makeFilterGraphString(videoClips, bpm, notes, durations) {
  //notes = notes.splice(0, 4);
  const gridWidth = 4;
  const gridHeight = Math.ceil(midiNotesInGrid.length / gridWidth);
  const cellSize = 200;

  let filters = [];

  // TODO: We should probably sort notes by the time when they start

  // TODO: What about videos that are tall?
  const scaleFilter = `scale=h=${cellSize}:force_original_aspect_ratio=decrease`;
  // Crops videos to their central square
  const cropFilter = `crop=out_w=${cellSize}:out_h=${cellSize}`;

  midiNotesInGrid.forEach((midiNote, i) => {
    const outputIndexes = notes
      .map((tuple, i) => (realizedMidiNote(tuple[0]) === midiNote ? i : null))
      .filter(i => i != null);

    const playbackParams = videoClips[midiNote].playbackParams;

    // TODO: Add a filter to adjust the playback rate

    const videoClipId = videoClips[midiNote].videoClipId;
    const duration = durations[videoClipId];
    const trimFilter = `trim=start=${playbackParams.trimStart * duration}:end=${playbackParams.trimEnd * duration}`;

    if (outputIndexes.length > 0) {
      const videoOuputs = outputIndexes
        .map(i => `[schedulednoteinput:v:${i}]`)
        .join(" ");

      const audioOutputs = outputIndexes
        .map(i => `[schedulednoteinput:a:${i}]`)
        .join(" ");

      // Video stream
      filters.push(
        `[${i}:v] ${scaleFilter}, ${cropFilter}, ${trimFilter}, split=${outputIndexes.length} ${videoOuputs}`
      );
    }
  });

  notes.forEach(([midiNote, beatStart, beatDuration], i) => {
    const playbackParams =
      videoClips[realizedMidiNote(midiNote)].playbackParams;
    const videoClipId = videoClips[realizedMidiNote(midiNote)].videoClipId;
    const duration = durations[videoClipId];

    // XXX: include beatDuration somehow
    const timestamp = beatsToTimestamp(beatStart, bpm);
    const setptsFilter = `setpts=PTS-STARTPTS+(${timestamp})/TB`;

    filters.push(
      `[schedulednoteinput:v:${i}] ${setptsFilter} [schedulednote:v:${i}]`
    );

    // TODO: Ideally we could use PTS to sync the audio instead of adding a delay
    let audioFilter;
    if (timestamp === 0) {
      audioFilter = "volume=1.0"; // No-op
    } else {
      audioFilter = `adelay=${timestamp * 1000}`;
    }
  });

  //
  // Build video grid
  //
  filters.push(
    `color=color=red:size=${gridWidth * cellSize}x${gridHeight * cellSize}, trim=duration=15 [base]`
  );

  notes.forEach(([midiNote, beatStart, duration], i) => {
    const lastSource = i === 0 ? "base" : `tmp:${i - 1}`;
    const gridPosition = midiNotesInGrid.indexOf(realizedMidiNote(midiNote));
    const row = Math.floor(gridPosition / gridWidth);
    const column = gridPosition % gridWidth;
    const x = column * cellSize;
    const y = row * cellSize;

    const output = i === notes.length - 1 ? "[final]" : `[tmp:${i}]`;

    filters.push(
      `[${lastSource}][schedulednote:v:${i}] overlay=x=${x}:y=${y}:eof_action=pass ${output}`
    );
  });

  filters.push(`[${midiNotesInGrid.length}:a] volume=1.0`);

  return filters.join("; \n");
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
      Object.assign({}, input, { durations: makeObject(result) })
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
