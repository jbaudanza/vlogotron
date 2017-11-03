const fs = require('fs');

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
    fs.readFile('./input.json', function(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(JSON.parse(data));
      }
    })
  })
};

function escapeFilter(str) {
  return str.replace(/,/g, "\\,");
}

function makeFilterGraphString(bpm, notes) {
  const gridWidth = 4;
  const gridHeight = Math.ceil(midiNotesInGrid.length / gridWidth);
  const cellSize = 200;

  let filters = [];

  
  // TODO: What about videos that are tall?
  const scaleFilter = `scale=h=${cellSize}:force_original_aspect_ratio=decrease`;
  // Crops videos to their central square
  const cropFilter = `crop=out_w=${cellSize}:out_h=${cellSize}`;

  midiNotesInGrid.forEach((midiNote, i) => {
    filters.push(`[${i}:v] ${scaleFilter}, ${cropFilter} [midi:${midiNote}]`);
  });

  notes.forEach(([midiNote, beatStart, beatDuration], i) => {
    // XXX: derive this from beatState and bpm
    const setptsFilter = `setpts=PTS+${i * 0.25}/TB`;

    let realizedMidiNote;
    if (isSharp(midiNote)) {
      // TODO: Alter playback speed to compensate
      realizedMidiNote = midiNote - 1;
    } else {
      realizedMidiNote = midiNote;
    }

    filters.push(`[midi:${realizedMidiNote}] ${setptsFilter} [schedulednote:${i}]`)
  });

  filters.push(
    `nullsrc=size=${gridWidth * cellSize}x${gridHeight * cellSize} [nullsrc]`
  );
  filters.push(
    `[nullsrc] trim=duration=5 [base]`
  )

  notes.forEach(([midiNote, beatStart, duration], i) => {
    const lastSource = i === 0 ? "base" : `tmp:${i - 1}`;
    const gridPosition = midiNotesInGrid.indexOf(midiNote);
    const row = Math.floor(gridPosition / gridWidth);
    const column = gridPosition % gridWidth;
    const x = column * cellSize;
    const y = row * cellSize;

    const output = i === notes.length - 1 ? "" : `[tmp:${i}]`;

    filters.push(
      `[${lastSource}][schedulednote:${i}] overlay=x=${x}:y=${y} ${output}`
    );
  });

  return filters.join("; \n");
}

readInput().then((input) => fs.writeFile("filterscript", makeFilterGraphString(input.song.bpm, input.song.notes)));
