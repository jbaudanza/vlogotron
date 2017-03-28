import {Subject} from 'rxjs/Subject';

import audioContext from './audioContext';

import {playCommands$ as midiPlayCommands$} from './midi';
import {playCommands$ as keyboardPlayCommands$} from './keyboard';


// TODO: This should also playback full songs
export default class AudioPlaybackEngine {
  constructor(audioBuffers$, playCommands$) {
    const activeNodes = {};

    const subject = new Subject();

    this.destinationNode = audioContext.createGain();
    this.destinationNode.gain.value = 0.9;
    this.destinationNode.connect(audioContext.destination);

    this.subscription = playCommands$
      .withLatestFrom(audioBuffers$)
      .subscribe(([cmd, audioBuffers]) => {
        if (cmd.play && audioBuffers[cmd.play]) {
          const node = audioContext.createBufferSource();
          node.buffer = audioBuffers[cmd.play];
          node.connect(this.destinationNode);
          activeNodes[cmd.play] = node;
          node.start();
        }

        if (cmd.pause && activeNodes[cmd.pause]) {
          activeNodes[cmd.pause].stop();
        }

        subject.next(Object.assign({when: audioContext.currentTime}, cmd));
      });

    this.playCommands$ = subject.asObservable();
  }

  destroy() {
    this.subscription.unsubscribe();
  }
}
