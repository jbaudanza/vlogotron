const fs = require("fs");
const { spawnSync } = require("child_process");

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

// TODO: this should probably return a promise
function queryDuration(videoClipId) {
  const child = spawnSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filenameForVideoClip(videoClipId)
  ]);

  // TODO: check child.error
  if (child.status !== 0) {
    console.log(child.stderr.toString("utf8"));
  } else {
    return parseFloat(child.stdout.toString("utf8"));
  }
}

function makeFilterGraphString(videoClips, bpm, notes) {
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
    const duration = queryDuration(videoClipId);
    const trimFilter = `trim=start=${playbackParams.trimStart * duration}:end=${playbackParams.trimEnd * duration}`;

    if (outputIndexes.length > 0) {
      const outputs = outputIndexes
        .map(i => `[schedulednoteinput:${i}]`)
        .join(" ");
      filters.push(
        `[${i}:v] ${scaleFilter}, ${cropFilter}, ${trimFilter}, split=${outputIndexes.length} ${outputs}`
      );
    }
  });

  notes.forEach(([midiNote, beatStart, beatDuration], i) => {
    // XXX: include beatDuration somehow
    const timestamp = beatsToTimestamp(beatStart, bpm);
    const setptsFilter = `setpts=PTS+${timestamp}/TB`;

    filters.push(
      `[schedulednoteinput:${i}] ${setptsFilter} [schedulednote:${i}]`
    );
  });

  filters.push(
    `nullsrc=size=${gridWidth * cellSize}x${gridHeight * cellSize} [nullsrc]`
  );
  filters.push(`[nullsrc] trim=duration=5 [base]`);

  notes.forEach(([midiNote, beatStart, duration], i) => {
    const lastSource = i === 0 ? "base" : `tmp:${i - 1}`;
    const gridPosition = midiNotesInGrid.indexOf(realizedMidiNote(midiNote));
    const row = Math.floor(gridPosition / gridWidth);
    const column = gridPosition % gridWidth;
    const x = column * cellSize;
    const y = row * cellSize;

    const output = i === notes.length - 1 ? "[final]" : `[tmp:${i}]`;

    filters.push(
      `[${lastSource}][schedulednote:${i}] overlay=x=${x}:y=${y} ${output}`
    );
  });

  return filters.join("; \n");
}

readInput().then(input =>
  fs.writeFile(
    "filterscript",
    makeFilterGraphString(input.videoClips, input.song.bpm, input.song.notes)
  )
);
