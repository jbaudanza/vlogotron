import {Observable} from 'rxjs/Observable';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';

import {identity} from 'lodash';


const keyUp$ = Observable.fromEvent(document, 'keyup');
const keyDown$ = Observable.fromEvent(document, 'keydown');

const keys$ = Observable.merge(
    Observable.fromEvent(document, 'keyup'),
    Observable.fromEvent(document, 'keydown')
);

const codeMap = {
  'KeyA': 'C',
  'KeyW': 'C#',
  'KeyS': 'D',
  'KeyE': 'D#',
  'KeyD': 'E',
  'KeyF': 'F',
  'KeyT': 'F#',
  'KeyG': 'G',
  'KeyY': 'G#',
  'KeyH': 'A',
  'KeyU': 'A#',
  'KeyJ': 'B'
};

// Based off of the table in: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
const keyCodeMap = {
  0x41: 'C',  // KeyA
  0x57: 'C#', // KeyW
  0x53: 'D',  // KeyS
  0x45: 'D#', // KeyE
  0x44: 'E',  // KeyD
  0x46: 'F',  // KeyF
  0x54: 'F#', // KeyT
  0x47: 'G',  // KeyG
  0x59: 'G#', // KeyY
  0x48: 'A',  // KeyH
  0x55: 'A#', // KeyU
  0x4A: 'B'   // KeyJ
};


export const playCommands$ = keys$.map(function(event) {
  if (event.repeat)
    return;

  // event.code is the preferred to determine which key is pressed, but it's not
  // always supported. We can fall back to event.keyCode, which is deprecated,
  // but more widely available. We specifically do NOT want to use event.key,
  // because we are interested in which physical key was pressed, not the
  // character value of the key.
  let note;
  if ('code' in event) {
    note = codeMap[event.code];
  } else {
    note = keyCodeMap[event.keyCode];
  }

  if (note) {
    const type = (event.type === 'keydown' ? 'play' : 'pause');
    return { [type]: note };
  }
}).filter(identity);
