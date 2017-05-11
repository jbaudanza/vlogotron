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

  for(i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}

// read midi file
var filename = process.argv[2];
var midiFile = new MIDIFile(toArrayBuffer(
    fs.readFileSync(filename)
  ));

// read headers
midiFile.header.getFormat(); // 0, 1 or 2
midiFile.header.getTracksCount(); // n

var trackEventsChunk = midiFile.tracks[1].getTrackContent();
var events = MIDIEvents.createParser(trackEventsChunk);

var event;
var offset = 0;
var vlogNotes = [];

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const minNoteNum = 60, maxNoteNum = 75;

const midRange = meanNote(minNoteNum, maxNoteNum);

const defaultDuration = 1.0, minDuration = 0.1;

var noteNum, noteName, oct;

function meanNote(min, max)
{
  return Math.round((max + min) / 2);
}

function findRange(events)
{
  var min = 127;
  var max = 0;
  while(event = events.next()) {
    if(event.type === MIDIEvents.EVENT_MIDI) {
      var noteNum = event.param1;
      if (noteNum < min)
      {
        min = noteNum;
      }
      if (noteNum > max)
      {
        max = noteNum;
      }
    }
  }
  return {min: min, max: max};
}

var range = findRange(events);

var transposition = 0;

// find ideal middle range transposition
if (range.min < minNoteNum || range.max > maxNoteNum)
{
  transposition = meanNote(range.min, range.max) - midRange;
}

function round (num)
{
  return Math.round(num * 100) / 100;
}

events = MIDIEvents.createParser(trackEventsChunk);
while(event = events.next()) {
  offset += event.delta;
  if(event.type === MIDIEvents.EVENT_MIDI) {
    // normalize octave to Vlogotron range
    //C4 ... D#5
    //60 ... 75
    noteNum = parseInt(event.param1) + transposition;

    // if individual notes still out of range,
    // transpose each by an octave until in range
    while (noteNum < minNoteNum)
    {
      noteNum += 12;
    }

    while (noteNum > maxNoteNum)
    {
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
      note[1] = round(offset / midiFile.header.getTicksPerBeat());
      // set default duration
      note[2] = defaultDuration;

      vlogNotes.push(note);

    } else if (event.subtype === MIDIEvents.EVENT_MIDI_NOTE_OFF) {

      // infer duration
      // look backwards on note off event
      for (var i = vlogNotes.length - 1; i >= 0; i--) {
        if (vlogNotes[i][0] === (noteName + oct))
        {
          var dur = round(event.delta / midiFile.header.getTicksPerBeat());
          if (dur >= minDuration)
          {
            vlogNotes[i][2] = dur;
          }
        }
      }
    }
  }
}

console.log(JSON.stringify(vlogNotes, null, 2));
