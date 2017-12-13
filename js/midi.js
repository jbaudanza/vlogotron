/* @flow */
import { Observable } from "rxjs/Observable";

import type { LivePlayCommand } from "./AudioPlaybackEngine";

const midiAccess$ = Observable.defer(() => {
  if (navigator.requestMIDIAccess) {
    return navigator.requestMIDIAccess();
  } else {
    return Observable.empty();
  }
});

const midiMessages$ = midiAccess$.switchMap(function(midiAccess) {
  const list = [];
  for (let input of midiAccess.inputs.values()) {
    list.push(Observable.fromEvent(input, "midimessage"));
  }
  return Observable.merge(...list);
});

const MIDI_NOTE_ON = 0x90;
const MIDI_NOTE_OFF = 0x80;
const MIDI_ALL_NOTES_OFF = 0x58;

const MIDI_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];

export function midiNoteToLabel(midiNote: number): string {
  return (
    MIDI_NOTES[midiNote % MIDI_NOTES.length] +
    String(Math.floor(midiNote / MIDI_NOTES.length) - 1)
  );
}

export function labelToMidiNote(label: string): ?number {
  const match = label.toUpperCase().match(/([\w#]+)([\-\d]+)/);
  if (match) {
    const note = match[1];
    const noteOffset = MIDI_NOTES.indexOf(note);
    if (noteOffset === -1) return null;

    const octave = parseInt(match[2]);

    return noteOffset + (octave + 1) * MIDI_NOTES.length;
  } else {
    return null;
  }
}

export const playCommands$ = midiMessages$
  .map(function(message: MIDIMessageEvent): ?LivePlayCommand {
    const channel = message.data[0] & 0xf;
    const type = message.data[0] & 0xf0;

    const note = message.data[1];
    const velocity = message.data[2];

    // Detect a note ending. See http://stackoverflow.com/a/21636112/667069
    if (
      type === MIDI_NOTE_OFF ||
      type === MIDI_ALL_NOTES_OFF ||
      (type === MIDI_NOTE_ON && velocity === 0)
    ) {
      return {
        pause: note,
        velocity: velocity
      };
      // Detect a note on
      // TODO: Investigate if it's possible to get multiple NOTE_ON messages for
      // the same key press. For example, perhaps multiple note ons are generated
      // with different velocities. If this is the case, we might need to track
      // some state around this.
    } else if (type === MIDI_NOTE_ON && velocity > 0) {
      return {
        play: note,
        velocity: velocity
      };
    } else {
      return null;
    }
  })
  .nonNull();

// This is like lodash's omit, except it works with numbers for keys
export function omitNote<V>(
  input: { [number]: V },
  omitKey: number
): { [number]: V } {
  const result: { [number]: V } = {};
  for (let key in input) {
    if (
      typeof key === "number" && input.hasOwnProperty(key) && key !== omitKey
    ) {
      result[key] = input[key];
    }
  }
  return result;
}
