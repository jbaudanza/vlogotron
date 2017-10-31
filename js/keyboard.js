import { Observable } from "rxjs/Observable";

const keyUp$ = Observable.fromEvent(document, "keyup");
const keyDown$ = Observable.fromEvent(document, "keydown");

const keys$ = Observable.merge(
  Observable.fromEvent(document, "keyup"),
  Observable.fromEvent(document, "keydown")
);

const codeMap = {
  KeyA: 48, // C3,
  KeyW: 49, // C#
  KeyS: 50, // D3
  KeyE: 51, // D#3
  KeyD: 52, // E3
  KeyF: 53, // F3
  KeyT: 54, // F#3
  KeyG: 55, // G3
  KeyY: 56, // G#3
  KeyH: 57, // A3
  KeyU: 58, // A#3
  KeyJ: 59, // B3
  KeyK: 60, // C4
  KeyO: 61, // C#4
  KeyL: 62, // D4
  KeyP: 63, // D#4
  Semicolon: 64, // E4
  Quote: 65 // F4
};

// Based off of the table in: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
const keyCodeMap = {
  0x41: 48, // C3  KeyA
  0x57: 49, // C#3 KeyW
  0x53: 50, // D3  KeyS
  0x45: 51, // D#3 KeyE
  0x44: 52, // E3  KeyD
  0x46: 53, // F3  KeyF
  0x54: 54, // F#3 KeyT
  0x47: 55, // G3  KeyG
  0x59: 56, // G#3 KeyY
  0x48: 57, // A3  KeyH
  0x55: 58, // A#3 KeyU
  0x4a: 59, // B3  KeyJ,
  0x4b: 60, // C4  KeyK,
  0x4f: 61, // C#4 KeyO,
  0x4c: 62, // D4  KeyL,
  0xba: 63, // D#4 Semicolon
  0xde: 64 // F4  Quote
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
