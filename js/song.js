import { concat, filter, findIndex, max } from "lodash";

// Consider encoding this like:
/*
{
  signature: [4,4],
  start: {
    measure: 0,
    beat: 0
  }
  notes: [
    [ 'A4', 0, 0, 4 ] // note, measure, beat, note type
  ]
}
*/

const maryHadALittleLamb = [
  ["A4", 0, 1], // Ma-
  ["G4", 1, 1], // ry
  ["F4", 2, 1], // had
  ["G4", 3, 1], // a

  ["A4", 4, 1], // lit-
  ["A4", 5, 1], // tle
  ["A4", 6, 2], // lamb

  ["G4", 8, 1], // lit-
  ["G4", 9, 1], // tle
  ["G4", 10, 2], // lamb

  ["A4", 12, 1], // lit-
  ["C5", 13, 1], // tle
  ["C5", 14, 2], // lamb

  ["A4", 16, 1], // Ma-
  ["G4", 17, 1], // ry
  ["F4", 18, 1], // had
  ["G4", 19, 1], // a

  ["A4", 20, 1], // lit-
  ["A4", 21, 1], // tle
  ["A4", 22, 1], // lamb
  ["A4", 23, 1], // its

  ["G4", 24, 1], // fleece
  ["G4", 25, 1], // was
  ["A4", 26, 1], // white
  ["G4", 27, 1], // as

  ["F4", 28, 2] // snow
];

// time-signature is 3/4
const happyBirthday = [
  // -silent
  ["D4", 3, 0.5], // hap-
  ["D4", 3.5, 0.5], // py

  ["E4", 4, 1], // birth
  ["D4", 5, 1], // day
  ["G4", 6, 1], // to

  ["F#4", 7, 2], // you
  ["D4", 9, 0.5], // hap-
  ["D4", 9.5, 0.5], // py

  ["E4", 10, 1], // birth
  ["D4", 11, 1], // day
  ["A4", 12, 1], // to

  ["G4", 13, 2], // you
  ["D4", 15, 0.5], // hap-
  ["D4", 15.5, 0.5], // py

  ["D5", 16, 1], // birth
  ["B4", 17, 1], // day
  ["G4", 18, 1], // dear

  ["F#4", 19, 1], // blah
  ["E4", 20, 1], // blah
  ["C5", 21, 0.5], // hap-
  ["C5", 21.5, 0.5], // py

  ["B4", 22, 1], // birth
  ["G4", 23, 1], // day
  ["A4", 24, 1], // to

  ["G4", 25, 1] // you
];

export const songs = {
  "mary-had-a-little-lamb": {
    title: "Mary had a Little Lamb",
    notes: maryHadALittleLamb,
    bpm: 120
  },
  "happy-birthday": {
    title: "Happy Birthday",
    notes: happyBirthday,
    bpm: 120
  }
};

export function timestampToBeats(timestamp, bpm) {
  return timestamp / 60.0 * bpm;
}

export function beatsToTimestamp(beats, bpm) {
  return beats / bpm * 60;
}

export function songLengthInBeats(notes) {
  return max(notes.map(note => note[1] + note[2])) || 0;
}

export function songLengthInSeconds(notes, bpm) {
  return beatsToTimestamp(songLengthInBeats(notes), bpm);
}

export function reduceEditsToNotes(notes, edit) {
  function matcher(edit, note) {
    return note[0] === edit.note && note[1] === edit.beat;
  }

  switch (edit.action) {
    case "clear-all":
      return [];
    case "replace-all":
      return edit.notes;
    case "create":
      return concat(notes, [[edit.note, edit.beat, edit.duration]]);
    case "delete":
      return filter(notes, note => !matcher(edit, note));
    case "move":
      const index = findIndex(notes, matcher.bind(null, edit.from));
      if (index !== -1) {
        const oldDuration = notes[index][2];
        return concat(
          filter(notes, (v, i) => i !== index), // remove old note
          [[edit.to.note, edit.to.beat, oldDuration]] // add new note
        );
      } else {
        return notes;
      }
    default:
      return notes;
  }
}

export function reduceEditsToSong(song, edit) {
  switch (edit.action) {
    case "change-bpm":
      return Object.assign({}, song, { bpm: edit.bpm });
    case "change-title":
      return Object.assign({}, song, { title: edit.title });
    default:
      return Object.assign({}, song, {
        notes: reduceEditsToNotes(song.notes, edit)
      });
  }
}
