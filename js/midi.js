/* @flow */
import { Observable } from "rxjs/Observable";

import { identity } from "lodash";

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

export const playCommands$ = midiMessages$
  .map(function(message: MIDIMessageEvent): any {
    const channel = message.data[0] & 0xf;
    const type = message.data[0] & 0xf0;

    const note = message.data[1];
    const velocity = message.data[2];

    // Add the octave to the note
    const noteString = MIDI_NOTES[note % 12] + Math.floor(note / 12);

    // Detect a note ending. See http://stackoverflow.com/a/21636112/667069
    if (
      type === MIDI_NOTE_OFF ||
      type === MIDI_ALL_NOTES_OFF ||
      (type === MIDI_NOTE_ON && velocity === 0)
    ) {
      return {
        pause: noteString
      };
      // Detect a note on
      // TODO: Investigate if it's possible to get multiple NOTE_ON messages for
      // the same key press. For example, perhaps multiple note ons are generated
      // with different velocities. If this is the case, we might need to track
      // some state around this.
    } else if (type === MIDI_NOTE_ON && velocity > 0) {
      return {
        play: noteString
      };
    } else {
      return null;
    }
  })
  .filter(identity);
