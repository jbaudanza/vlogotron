import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";
import { animationFrame } from "rxjs/scheduler/animationFrame";

import audioContext from "./audioContext";
import { playbackSchedule } from "./playbackSchedule";

import { songLengthInBeats, beatsToTimestamp, timestampToBeats } from "./song";

// This is the minimum amount of time we will try to schedule audio in the
// future. This is based on the following comment by Chris Wilson:
// https://github.com/WebAudio/web-audio-api/issues/296#issuecomment-257100626
// https://webaudio.github.io/web-audio-api/#widl-BaseAudioContext-baseLatency
const batchTime = audioContext.baseLatency || 2 * 128 / audioContext.sampleRate;

export function startLivePlaybackEngine(
  audioBuffers$,
  playCommands$,
  subscription
) {
  const activeNodes = {};

  const stream$ = observableWithGainNode(destinationNode =>
    playCommands$.withLatestFrom(audioBuffers$).map(([cmd, audioBuffers]) => {
      const when = audioContext.currentTime + batchTime;
      if (cmd.play) {
        const [noteName, node] = buildSourceNode(cmd.play, audioBuffers);

        if (node) {
          node.connect(destinationNode);
          activeNodes[cmd.play] = node;
          node.start(when);
        }
      }

      if (cmd.pause && activeNodes[cmd.pause]) {
        activeNodes[cmd.pause].stop(when);
      }

      return { when, ...cmd };
    })
  ).publish();

  subscription.add(stream$.connect());

  return stream$;
}

class GainNodeResource {
  constructor() {
    this.node = audioContext.createGain();
    this.node.gain.value = 0.9;
    this.node.connect(audioContext.destination);
  }

  unsubscribe() {
    this.node.disconnect();
  }
}

function observableWithGainNode(observableFactory) {
  return Observable.using(
    () => new GainNodeResource(),
    resource => observableFactory(resource.node)
  );
}

function createGainNode() {
  const node = audioContext.createGain();
  node.gain.value = 0.9;
  node.connect(audioContext.destination);
  return node;
}

function buildSourceNode(requestedNoteName, audioBuffers) {
  const isSharp = requestedNoteName.indexOf("#") >= 0;
  const noteName = requestedNoteName.replace("#", "");
  const audioBuffer = audioBuffers[noteName];

  if (audioBuffer) {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // alter playback rate for sharp notes,
    // simply use just intonation for now
    const pitchRatio = isSharp ? 1.05946 : 1.0;
    source.playbackRate.value = pitchRatio;
    return [noteName, source];
  } else {
    console.warn("missing audiobuffer for", requestedNoteName);
    return [noteName, null];
  }
}

export function startScriptedPlayback(
  notes$,
  bpm,
  startPosition,
  audioBuffers$,
  playUntil$
) {
  const truncatedNotes$ = notes$.map(notes =>
    notes
      .filter(note => note[1] >= startPosition)
      .map(note => [note[0], note[1] - startPosition, note[2]])
  );

  function pickNotesForBeatWindow(beatWindow, notes) {
    const [beatFrom, beatTo] = beatWindow;
    return notes.filter(note => note[1] >= beatFrom && note[1] < beatTo);
  }

  // TODO: 125ms is a long time, but using batchTime instead leads to late
  // playbacks. Why is this? Probably because it takes too long for the
  // audioScheduler to startup.
  const playbackStartedAt = audioContext.currentTime + 0.125;

  // Returns the time window (in beats) that need to be scheduled
  function makeBeatWindow(lastWindow, playbackUntilTimestamp) {
    return [
      lastWindow[1],
      timestampToBeats(playbackUntilTimestamp - playbackStartedAt, bpm)
    ];
  }

  // TODO: If the song isn't going to change, we don't need the playback
  // scheduler.
  const commandsWithAudioBuffers$ = playbackSchedule(audioContext)
    .scan(makeBeatWindow, [null, 0])
    .withLatestFrom(truncatedNotes$)
    // TODO: This really should be takeUntil with a predicate function, but
    // that doesn't exist. Right now we're emitting one more than we need to.
    .takeWhile(
      ([beatWindow, notes]) => beatWindow[0] < songLengthInBeats(notes)
    )
    .map(([beatWindow, notes]) => pickNotesForBeatWindow(beatWindow, notes))
    .withLatestFrom(audioBuffers$);

  const stream$ = observableWithGainNode(gainNode =>
    commandsWithAudioBuffers$
      .map(([commands, audioBuffers]) => {
        const events = [];

        commands.forEach(command => {
          const [noteName, source] = buildSourceNode(command[0], audioBuffers);

          let startAt = playbackStartedAt + beatsToTimestamp(command[1], bpm);
          const duration = beatsToTimestamp(command[2], bpm);

          if (source) {
            let offset;
            if (audioContext.currentTime > startAt) {
              offset = audioContext.currentTime - startAt;
              startAt = 0;
              console.warn("scheduling playback late.", offset);
            } else {
              offset = 0;
            }
            source.connect(gainNode);
            source.start(startAt, offset, duration);
          }

          events.push({ play: noteName, when: startAt });
          events.push({ pause: noteName, when: startAt + duration });
        });

        return events;
      })
      .flatMap(events =>
        Observable.from(events).flatMap(obj =>
          Observable.of(obj).delay((obj.when - audioContext.currentTime) * 1000)
        )
      )
      .takeUntil(playUntil$)
  ).publish();

  // Make this hot right away. We don't need to worry about unsubscribing,
  // because the stream will end when the song is over or playUntil$ fires.
  stream$.connect();

  return {
    playbackStartedAt: playbackStartedAt,
    startPosition: startPosition,
    bpm: bpm,
    playCommands$: stream$
  };
}
