import {Subject} from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';
import {animationFrame} from 'rxjs/scheduler/animationFrame';

import audioContext from './audioContext';
import {playbackSchedule} from './playbackSchedule';


import {max, flatten} from 'lodash';

// TODO: This should also playback full songs
export default class AudioPlaybackEngine {
  constructor(audioBuffers$, playCommands$, songPlayback$) {
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

    this.subscription.add(songPlayback$.subscribe((command) => {
      startPlayback(
        command.song,
        command.bpm,
        command.startPosition,
        command.playUntil$,
        audioBuffers$
      )
    }))

    this.playCommands$ = subject.asObservable();
  }

  destroy() {
    this.subscription.unsubscribe();
  }
}



function startPlayback(song, bpm, startPosition, playUntil$, audioBuffers$) {
  const playbackStartedAt = audioContext.currentTime + 0.125;

  const truncatedSong = song
      .filter(note => note[1] >= startPosition)
      .map(note => [note[0], note[1] - startPosition, note[2]])

  function mapToNotes(beatWindow) {
    const [beatFrom, beatTo] = beatWindow;
    return truncatedSong.filter((note) => note[1] >= beatFrom && note[1] < beatTo);
  }

  const songLengthInBeats = max(truncatedSong.map(note => note[1] + note[2]));

  const playCommandsForVisuals$ = Observable.from(flatten(truncatedSong.map(function(note) {
    const startAt = playbackStartedAt + beatsToTimestamp(note[1], bpm);
    const stopAt =  startAt + beatsToTimestamp(note[2], bpm);

    function makeEvent(obj, when) {
      return Observable.of(
        Object.assign({when}, obj)
      ).delay((when - audioContext.currentTime) * 1000);
    }

    return [
        makeEvent({play: note[0]}, startAt), makeEvent({pause: note[0]}, stopAt)
    ];
  }))).mergeAll().takeUntil(playUntil$);

  // Returns the time window (in beats) that need to be scheduled
  function makeBeatWindow(lastWindow, playbackUntilTimestamp) {
    return [
      lastWindow[1],
      timestampToBeats(playbackUntilTimestamp - playbackStartedAt, bpm)
    ];
  }

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.9;
  gainNode.connect(audioContext.destination);
  // Silence all audio when the pause button is hit
  playUntil$.subscribe(x => gainNode.gain.value = 0);

  playbackSchedule(audioContext)
      .takeUntil(playUntil$)
      .scan(makeBeatWindow, [null, 0])
      // TODO: This really should be takeUntil with a predicate function, but
      // that doesn't exist. Right now we're emitting one more than we need to.
      .takeWhile(beatWindow => beatWindow[0] < songLengthInBeats)
      .map(mapToNotes)
      .withLatestFrom(audioBuffers$)
      .subscribe({
        next([commands, audioBuffers]) {
          commands.forEach((command) => {
            console.log('scheduling', command)
            const audioBuffer = audioBuffers[command[0]];
            if (audioBuffer) {
              const startAt = playbackStartedAt + beatsToTimestamp(command[1], bpm);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNode);

              let offset;
              if (audioContext.currentTime > startAt) {
                offset = audioContext.currentTime - startAt;
                console.warn('scheduling playback late.', offset);
              } else {
                offset = 0;
              }
              source.start(startAt, offset, beatsToTimestamp(command[2], bpm));
            } else {
              console.warn('missing audiobuffer for', command[0])
            }
          })
        }
      });

  const position$ = Observable
      .of(0, animationFrame)
      .repeat()
      .map(() => timestampToBeats(audioContext.currentTime - playbackStartedAt, bpm))
      .filter(beat => beat >= 0)
      .takeWhile(beat => beat < songLengthInBeats)
      .takeUntil(playUntil$)
      .map(beat => beat + startPosition);

  return {
    playCommandsForVisuals$: playCommandsForVisuals$,
    position: position$,
    finished: Observable.merge(
        playUntil$,
        Observable.of(1).delay(beatsToTimestamp(songLengthInBeats, bpm) * 1000
    )).first().toPromise()
  }
};

function timestampToBeats(timestamp, bpm) {
  return (timestamp / 60.0) * bpm;
}

function beatsToTimestamp(beats, bpm) {
  return (beats / bpm) * 60;
}
