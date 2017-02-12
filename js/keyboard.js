import {Observable} from 'rxjs/Observable';

Object.assign(Observable,
  require('rxjs/observable/fromEvent'),
  require('rxjs/observable/merge')
);

import {identity} from 'lodash';

const keyUp$ = Observable.fromEvent(document, 'keyup');
const keyDown$ = Observable.fromEvent(document, 'keydown');

const keys$ = Observable.merge(
    Observable.fromEvent(document, 'keyup'),
    Observable.fromEvent(document, 'keydown')
);

// This map keys off of event.code, and NOT event.key. For an explanation of
// the difference, see here: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
const keyMap = {
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

export const playCommands$ = keys$.map(function(event) {
  if (event.repeat)
    return;

  const note = keyMap[event.code];

  if (note) {
    const type = (event.type === 'keydown' ? 'play' : 'pause');
    return { [type]: note };
  }
}).filter(identity);
