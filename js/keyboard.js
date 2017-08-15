import { Observable } from "rxjs/Observable";

const keyUp$ = Observable.fromEvent(document, "keyup");
const keyDown$ = Observable.fromEvent(document, "keydown");

const keys$ = Observable.merge(
  Observable.fromEvent(document, "keyup"),
  Observable.fromEvent(document, "keydown")
);

const codeMap = {
  KeyA: "C3",
  KeyW: "C#3",
  KeyS: "D3",
  KeyE: "D#3",
  KeyD: "E3",
  KeyF: "F3",
  KeyT: "F#3",
  KeyG: "G3",
  KeyY: "G#3",
  KeyH: "A3",
  KeyU: "A#3",
  KeyJ: "B3",
  KeyK: "C4",
  KeyO: "C#4",
  KeyL: "D4",
  KeyP: "D#4",
  Semicolon: "E4",
  Quote: "F4"
};

// Based off of the table in: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
const keyCodeMap = {
  0x41: "C3", // KeyA
  0x57: "C#3", // KeyW
  0x53: "D3", // KeyS
  0x45: "D#3", // KeyE
  0x44: "E3", // KeyD
  0x46: "F3", // KeyF
  0x54: "F#3", // KeyT
  0x47: "G3", // KeyG
  0x59: "G#3", // KeyY
  0x48: "A3", // KeyH
  0x55: "A#3", // KeyU
  0x4a: "B3", // KeyJ,
  0x4b: "C4", // KeyK,
  0x4f: "C#4", // KeyO,
  0x4c: "D4", // KeyL,
  0xba: "D#4", // Semicolon
  0xde: "F4" // Quote
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
  .nonNull();
