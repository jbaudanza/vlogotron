import {Subject} from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';
import {animationFrame} from 'rxjs/scheduler/animationFrame';

import audioContext from './audioContext';
import {playbackSchedule} from './playbackSchedule';

import {songLengthInBeats, beatsToTimestamp, timestampToBeats} from './song';

// This is the minimum amount of time we will try to schedule audio in the
// future. This is based on the following comment by Chris Wilson:
// https://github.com/WebAudio/web-audio-api/issues/296#issuecomment-257100626
// https://webaudio.github.io/web-audio-api/#widl-BaseAudioContext-baseLatency
const batchTime = audioContext.baseLatency || ((2 * 128) / audioContext.sampleRate);

import {max, flatten} from 'lodash';


export function startLivePlaybackEngine(audioBuffers$, playCommands$, subscription) {
  const activeNodes = {};

  const stream$ = playCommands$
    .withLatestFrom(audioBuffers$, gainNode$)
    .map(([cmd, audioBuffers, destinationNode]) => {
      const when = audioContext.currentTime + batchTime;
      if (cmd.play && audioBuffers[cmd.play]) {
        const node = audioContext.createBufferSource();
        node.buffer = audioBuffers[cmd.play];
        node.connect(destinationNode);
        activeNodes[cmd.play] = node;
        node.start(when);
      }

      if (cmd.pause && activeNodes[cmd.pause]) {
        activeNodes[cmd.pause].stop(when);
      }

      return Object.assign({when}, cmd);
    }).publish();

  subscription.add(stream$.connect());

  return stream$;
}

const gainNode$ = Observable.create(function(observer) {
  const node = audioContext.createGain();
  node.gain.value = 0.9;
  node.connect(audioContext.destination);

  observer.next(node);

  return function() {
    node.disconnect();
  };
});


export function startScriptedPlayback(song, bpm, startPosition, playUntil$, audioBuffers$) {
  const playbackStartedAt = audioContext.currentTime + batchTime;

  const truncatedSong = song
      .filter(note => note[1] >= startPosition)
      .map(note => [note[0], note[1] - startPosition, note[2]])

  function mapToNotes(beatWindow) {
    const [beatFrom, beatTo] = beatWindow;
    return truncatedSong.filter((note) => note[1] >= beatFrom && note[1] < beatTo);
  }

  const length = songLengthInBeats(truncatedSong);

  // Returns the time window (in beats) that need to be scheduled
  function makeBeatWindow(lastWindow, playbackUntilTimestamp) {
    return [
      lastWindow[1],
      timestampToBeats(playbackUntilTimestamp - playbackStartedAt, bpm)
    ];
  }

  const playCommandsForVisuals$ = gainNode$.switchMap((gainNode) => {
    return playbackSchedule(audioContext)
        .takeUntil(playUntil$)
        .scan(makeBeatWindow, [null, 0])
        // TODO: This really should be takeUntil with a predicate function, but
        // that doesn't exist. Right now we're emitting one more than we need to.
        .takeWhile(beatWindow => beatWindow[0] < length)
        .map(mapToNotes)
        .withLatestFrom(audioBuffers$)
        .flatMap(([commands, audioBuffers]) => {
          const events = [];

          commands.forEach((command) => {
            const audioBuffer = audioBuffers[command[0]];

            let startAt = playbackStartedAt + beatsToTimestamp(command[1], bpm);
            const duration = beatsToTimestamp(command[2], bpm)

            if (audioBuffer) {
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNode);

              let offset;
              if (audioContext.currentTime > startAt) {
                offset = audioContext.currentTime - startAt;
                startAt = 0;
                console.warn('scheduling playback late.', offset);
              } else {
                offset = 0;
              }
              source.start(startAt, offset, duration);
            } else {
              console.warn('missing audiobuffer for', command[0])
            }

            events.push({play: command[0],  when: startAt});
            events.push({pause: command[0], when: startAt + duration});
          })

          return Observable.from(events)
              .flatMap(obj => Observable.of(obj).delay((obj.when - audioContext.currentTime) * 1000));

        });
  }).takeUntil(playUntil$);

  const position$ = Observable
      .of(0, animationFrame)
      .repeat()
      .map(() => timestampToBeats(audioContext.currentTime - playbackStartedAt, bpm))
      .filter(beat => beat >= 0)
      .takeWhile(beat => beat < length)
      .takeUntil(playUntil$)
      .map(beat => beat + startPosition);

  // TODO: finished can be derived from playCommandsForVisuals stream
  return {
    playCommandsForVisuals$: playCommandsForVisuals$,
    position: position$,
    finished: Observable.merge(
        playUntil$,
        Observable.of(1).delay(beatsToTimestamp(length, bpm) * 1000
    )).first().toPromise()
  }
};
