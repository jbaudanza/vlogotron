var MIDIFile = require("MIDIFile");
var MIDIEvents = require("midievents");
var fs = require("fs");

// Helper to get an ArrayBuffer from a NodeJS buffer
// Borrowed here : http://stackoverflow.com/questions/8609289/convert-a-binary-
// nodejs-buffer-to-javascript-arraybuffer
function toArrayBuffer(buffer) {
  var ab = new ArrayBuffer(buffer.length);
  var view = new Uint8Array(ab);
  var i;

  for (i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}

// read midi file
var filename = process.argv[2];
var midiFile = new MIDIFile(toArrayBuffer(fs.readFileSync(filename)));

// read headers
//TODO: handle all formats
midiFile.header.getFormat(); // 0, 1 or 2

const numTracks = midiFile.header.getTracksCount(); // n

var event;
var vlogNotes = [];

const noteNames = [
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

// normalize octave to Vlogotron range
// C3 ... D#5
// 48 ... 75
const minNoteNum = 48, maxNoteNum = 75;

const midRange = meanNote(minNoteNum, maxNoteNum);

const defaultDuration = 0.0, minDuration = 0.4;

var noteNum, noteName, oct;

function meanNote(min, max) {
  return Math.round((max + min) / 2);
}

// finds midi note range across all tracks
function findRange() {
  var min = 127;
  var max = 0;
  for (var trackNum = 1; trackNum < numTracks; trackNum++) {
    var trackEventsChunk = midiFile.tracks[trackNum].getTrackContent();
    var events = MIDIEvents.createParser(trackEventsChunk);

    var event;
    while ((event = events.next())) {
      if (event.type === MIDIEvents.EVENT_MIDI) {
        var noteNum = event.param1;
        if (noteNum < min) {
          min = noteNum;
        }
        if (noteNum > max) {
          max = noteNum;
        }
      }
    }
  }
  return { min: min, max: max };
}

var range = findRange();

var transposition = 0;

// find ideal middle range transposition
if (range.min < minNoteNum || range.max > maxNoteNum) {
  transposition = meanNote(range.min, range.max) - midRange;
}

function round(num) {
  return Math.round(num * 100) / 100;
}

for (var i = 1; i < numTracks; i++) {
  vlogNotes = vlogNotes.concat(readEvents(i));
}

function readEvents(trackNum) {
  var offset = 0;
  var trackEventsChunk = midiFile.tracks[trackNum].getTrackContent();
  var events = MIDIEvents.createParser(trackEventsChunk);
  var trackNotes = [];
  var event;

  while ((event = events.next())) {
    offset += event.delta;
    if (event.type === MIDIEvents.EVENT_MIDI) {
      noteNum = parseInt(event.param1) + transposition;

      // if individual notes still out of range,
      // transpose each by an octave until in range
      while (noteNum < minNoteNum) {
        noteNum += 12;
      }

      while (noteNum > maxNoteNum) {
        noteNum -= 12;
      }

      // map note number to note name
      noteName = noteNames[noteNum % 12];
      oct = Math.floor(noteNum / 12) - 1;
      if (event.subtype === MIDIEvents.EVENT_MIDI_NOTE_ON) {
        var note = [];
        //0: note name
        //1: beat offset
        //2: duration (in beats)
        note[0] = noteName + oct;
        // map time, dividing by ticks per beat
        note[1] = offset / midiFile.header.getTicksPerBeat();
        // set default duration
        note[2] = defaultDuration;

        trackNotes.push(note);
      } else if (event.subtype === MIDIEvents.EVENT_MIDI_NOTE_OFF) {
        // infer duration
        // look backwards on note off event
        for (var i = trackNotes.length - 1; i >= 0; i--) {
          if (trackNotes[i][0] === noteName + oct) {
            var dur = event.delta / midiFile.header.getTicksPerBeat();
            if (dur >= minDuration) {
              trackNotes[i][2] = dur;
            }
          }
        }
      }
    }
  }
  return trackNotes;
}

//sort events
function sortEvents(a, b) {
  // start time is index 1 of event array
  return a[1] - b[1];
}

vlogNotes.sort(sortEvents);

//remove duplicate notes, i.e. ones with identical pitches/start times
var matches = {};
var vlogNotesUnique = [];
for (var i = 0, l = vlogNotes.length; i < l; i++) {
  var key = vlogNotes[i][0] + "|" + vlogNotes[i][1];
  if (!matches[key]) {
    // round start time and duration
    vlogNotes[i][1] = round(vlogNotes[i][1]);
    vlogNotes[i][2] = round(vlogNotes[i][2]);

    vlogNotesUnique.push(vlogNotes[i]);
    matches[key] = true;
  }
}

console.log(JSON.stringify(vlogNotesUnique, null, 2));
