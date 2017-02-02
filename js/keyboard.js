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

const keyMap = {
  'a': 'C',
  'w': 'C#',
  's': 'D',
  'e': 'D#',
  'd': 'E',
  'f': 'F',
  't': 'F#',
  'g': 'G',
  'y': 'G#',
  'h': 'A',
  'u': 'A#',
  'j': 'B'
};

export const playCommands$ = keys$.map(function(event) {
  if (event.repeat)
    return;

  const note = keyMap[event.key];

  if (note) {
    const type = (event.type === 'keydown' ? 'play' : 'pause');
    return { [type]: note };
  }
}).filter(identity);
