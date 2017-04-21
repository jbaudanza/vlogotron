import { Observable } from "rxjs/Observable";

import { identity } from "lodash";

const keyUp$ = Observable.fromEvent(document, "keyup");
const keyDown$ = Observable.fromEvent(document, "keydown");

const keys$ = Observable.merge(
  Observable.fromEvent(document, "keyup"),
  Observable.fromEvent(document, "keydown")
);

const codeMap = {
  KeyA: "C4",
  KeyW: "C#4",
  KeyS: "D4",
  KeyE: "D#4",
  KeyD: "E4",
  KeyF: "F4",
  KeyT: "F#4",
  KeyG: "G4",
  KeyY: "G#4",
  KeyH: "A4",
  KeyU: "A#4",
  KeyJ: "B4",
  KeyK: "C5",
  KeyO: "C#5",
  KeyL: "D5",
  Semicolon: "D#5"
};

// Based off of the table in: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
const keyCodeMap = {
  0x41: "C4", // KeyA
  0x57: "C#4", // KeyW
  0x53: "D4", // KeyS
  0x45: "D#4", // KeyE
  0x44: "E4", // KeyD
  0x46: "F4", // KeyF
  0x54: "F#4", // KeyT
  0x47: "G4", // KeyG
  0x59: "G#4", // KeyY
  0x48: "A4", // KeyH
  0x55: "A#4", // KeyU
  0x4a: "B4", // KeyJ,
  0x4b: "C5", // KeyK,
  0x4f: "C#5", // KeyO,
  0x4c: "D5", // KeyL,
  0xba: "D#5" // Semicolon
};

function notInTextInput(event) {
  const el = event.target;
  return el.nodeName !== "INPUT" && el.nodeName !== "TEXTAREA";
}

export const playCommands$ = keys$
  .filter(notInTextInput)
  .map(function(event) {
    if (event.repeat) return;

    // event.code is the preferred to determine which key is pressed, but it's not
    // always supported. We can fall back to event.keyCode, which is deprecated,
    // but more widely available. We specifically do NOT want to use event.key,
    // because we are interested in which physical key was pressed, not the
    // character value of the key.
    let note;
    if ("code" in event) {
      note = codeMap[event.code];
    } else {
      note = keyCodeMap[event.keyCode];
    }

    if (note) {
      const type = event.type === "keydown" ? "play" : "pause";
      return { [type]: note };
    }
  })
  .filter(identity);
