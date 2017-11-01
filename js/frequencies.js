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

// Returns the multiplier needed to shift a frequency the given number of steps
export function shiftFrequency(steps) {
  return Math.pow(CONST_A, steps);
}
