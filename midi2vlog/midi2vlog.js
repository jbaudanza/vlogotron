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

var noteNum, noteName, oct;
while(event = events.next()) {
  offset += event.delta;
  if(event.type === MIDIEvents.EVENT_MIDI) {
    // map note number to note name
    //TODO: normalize octave to Vlogotron range?
    noteNum = event.param1;
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

      vlogNotes.push(note);

    } else if (event.subtype === MIDIEvents.EVENT_MIDI_NOTE_OFF) {

      // infer duration
      // look backwards on note off event
      for (var i = vlogNotes.length - 1; i >= 0; i--) {
        if (vlogNotes[i][0] === (noteName + oct))
        {
          vlogNotes[i][2] = event.delta / midiFile.header.getTicksPerBeat();
        }
      }
    }
  }
}

console.log(JSON.stringify(vlogNotes));
