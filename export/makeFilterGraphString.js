/* @flow */
import type { VideoClip } from "../js/database";
import type { ScheduledNoteList, ScheduledNote } from "../js/song";
import { songLengthInSeconds } from "../js/song";

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

function compareNotes(noteA: ScheduledNote, noteB: ScheduledNote) {
  // Sort first by start position
  if (noteA[1] !== noteB[1]) return noteA[1] - noteB[1];

  // Then by duration, longest first
  if (noteA[2] !== noteB[2]) return noteB[2] - noteA[2];

  // Then by midi note, lowest first
  return noteA[0] - noteB[0];
}

function testIntersection(noteA: ScheduledNote, noteB: ScheduledNote) {
  if (noteA[1] < noteB[1]) {
    return noteB[1] < noteA[1] + noteA[2];
  } else {
    return noteA[1] < noteB[1] + noteB[2];
  }
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

function isSharp(midiNote) {
  return [1, 3, 6, 8, 10].indexOf(midiNote % 12) != -1;
}

function filterNull<T>(input: Array<T>): Array<$NonMaybeType<T>> {
  return input.filter(i => i != null);
}

export function makeFilterGraphString(
  videoClips: { [number]: VideoClip },
  bpm: number,
  notes: ScheduledNoteList,
  durations: { [string]: number }
): string {
  const gridWidth = 4;
  const gridHeight = Math.ceil(midiNotesInGrid.length / gridWidth);
  const cellSize = 200;

  let filters = [];

  const sortedNotes = notes.slice(0); // clone
  sortedNotes.sort(compareNotes);

  // TODO: What about videos that are tall?
  const scaleFilter = `scale=h=${cellSize}:force_original_aspect_ratio=decrease`;
  // Crops videos to their central square
  const cropFilter = `crop=out_w=${cellSize}:out_h=${cellSize}`;

  midiNotesInGrid.forEach((midiNote, i) => {
    const outputIndexes = filterNull(
      sortedNotes.map(
        (tuple, i) => (realizedMidiNote(tuple[0]) === midiNote ? i : null)
      )
    );

    if (outputIndexes.length > 0) {
      const outputs = outputIndexes
        .map(i => `[schedulednoteinput:v:${i}]`)
        .join(" ");

      filters.push(
        `[${i}:v] ${scaleFilter}, ${cropFilter}, split=${outputIndexes.length} ${outputs}`
      );
    }
  });

  sortedNotes.forEach(([midiNote, beatStart, beatDuration], i) => {
    const playbackParams =
      videoClips[realizedMidiNote(midiNote)].playbackParams;
    const videoClipId = videoClips[realizedMidiNote(midiNote)].videoClipId;
    const duration = durations[videoClipId];

    // TODO: Add a filter to adjust the playback rate

    const start = playbackParams.trimStart * duration;
    const endOfBeat = start + beatsToTimestamp(beatDuration, bpm);
    const endOfTrim = playbackParams.trimEnd * duration;
    const end = Math.min(endOfBeat, endOfTrim);
    const trimFilter = `trim=start=${start}:end=${end}`;

    const timestamp = beatsToTimestamp(beatStart, bpm);
    const setptsFilter = `setpts=PTS-STARTPTS+(${timestamp})/TB`;

    filters.push(
      `[schedulednoteinput:v:${i}] ${trimFilter}, ${setptsFilter} [schedulednote:v:${i}]`
    );
  });

  //
  // Build video grid
  //
  const songDuration = songLengthInSeconds(sortedNotes, bpm);
  filters.push(
    `color=color=0x333333:size=${gridWidth * cellSize}x${gridHeight * cellSize}, trim=duration=${songDuration} [base]`
  );

  const gridPositions = new Array(sortedNotes.length);
  sortedNotes.forEach((note, i) => {
    gridPositions[i] = 0;

    if (i > 0) {
      for (let j = i - 1; j >= 0; j--) {
        if (sortedNotes[j][1] + sortedNotes[j][2] > note[1]) {
          gridPositions[i] = gridPositions[j] + 1;
          break;
        }
      }
    }
  });

  sortedNotes.forEach(([midiNote, beatStart, duration], i) => {
    const lastSource = i === 0 ? "base" : `tmp:${i - 1}`;

    const gridPosition = midiNotesInGrid.indexOf(realizedMidiNote(midiNote));
    //const gridPosition = gridPositions[i];

    const row = Math.floor(gridPosition / gridWidth);
    const column = gridPosition % gridWidth;
    const x = column * cellSize;
    const y = row * cellSize;

    const output = i === sortedNotes.length - 1 ? "[final]" : `[tmp:${i}]`;

    filters.push(
      `[${lastSource}][schedulednote:v:${i}] overlay=x=${x}:y=${y}:eof_action=pass ${output}`
    );
  });

  filters.push(`[${midiNotesInGrid.length}:a] volume=1.0`);

  return filters.join("; \n");
}
