import { mapValues } from "lodash";

// TODO: We should stop using note labels and use the midi notes directly.
export const noteLabelsToMidi = {
  C3: 36,
  "C#3": 37,
  D3: 38,
  "D#3": 39,
  E3: 40,
  F3: 41,
  "F#3": 42,
  G3: 43,
  "G#3": 44,
  A3: 45,
  "A#3": 46,
  B3: 47,
  C4: 48,
  "C#4": 49,
  D4: 50,
  "D#4": 51,
  E4: 52,
  F4: 53,
  "F#4": 54,
  G4: 55,
  "G#4": 56,
  A4: 57,
  "A#4": 58,
  B4: 59,
  C5: 60,
  "C#5": 61,
  D5: 62,
  "D#5": 63,
  E5: 64,
  F5: 65,
  "F#5": 66,
  G5: 67,
  "G#5": 68
};

// Based off of http://www.phy.mtu.edu/~suits/NoteFreqCalcs.html
const CONST_A = Math.pow(2, 1 / 12);
const CONST_LOG_A = Math.log(CONST_A);
const CONST_F0 = 440; // A4
const CONST_FIXED_NOTE = 57; // Midi for A4

export function noteToFrequency(note) {
  return CONST_F0 * Math.pow(CONST_A, note - CONST_FIXED_NOTE);
}

export function frequencyToNote(frequency) {
  return CONST_FIXED_NOTE + Math.log(frequency / CONST_F0) / CONST_LOG_A;
}

export const frequencies = mapValues(noteLabelsToMidi, noteToFrequency);
