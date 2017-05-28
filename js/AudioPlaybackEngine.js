import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";
import { animationFrame } from "rxjs/scheduler/animationFrame";

import audioContext from "./audioContext";
import { playbackSchedule } from "./playbackSchedule";
import { frequencies } from "./frequencies";

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
  const active = {};

  const stream$ = observableWithGainNode(destinationNode =>
    playCommands$
      .withLatestFrom(audioBuffers$)
      .map(([cmd, audioBuffers]) => {
        const when = audioContext.currentTime + batchTime;
        let event = null;

        if (cmd.play) {
          const [noteName, node] = buildSourceNode(cmd.play, audioBuffers, destinationNode);

          if (node) {
            const subject = new Subject();
            active[cmd.play] = { node, subject };
            node.start(when);

            event = {
              when,
              noteName: cmd.play,
              duration$: subject.asObservable()
            };
          }
        }

        if (cmd.pause && active[cmd.pause]) {
          active[cmd.pause].node.stop(when);
          active[cmd.pause].subject.next({});
          active[cmd.pause].subject.complete();
          delete active[cmd.pause];
        }

        return event;
      })
      .filter(x => x !== null)
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

function buildSourceNode(requestedNoteName, audioBuffers, destinationNode) {
  const isSharp = requestedNoteName.indexOf("#") >= 0;
  const noteName = requestedNoteName.replace("#", "");

  const audioBuffer = audioBuffers[noteName];

  if (audioBuffer) {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destinationNode);

    // alter playback rate for sharp notes,
    // simply use just intonation for now
    const pitchRatio = isSharp ? 1.05946 : 1.0;
    source.playbackRate.value = pitchRatio;

    return [noteName, source];
  } else {
    const source = audioContext.createOscillator();
    source.type = "square";
    source.frequency.value = frequencies[requestedNoteName];

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.05;
    gainNode.connect(destinationNode);
    source.connect(gainNode);

    return [noteName, source];
  }
}

function syncWithAudio(audioContext, when) {
  return Observable.defer(function() {
    const result$ = Observable.of(when);
    if (when < audioContext.currentTime) {
      return result$;
    } else {
      return result$.delay((when - audioContext.currentTime) * 1000);
    }
  });
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
      .flatMap(([commands, audioBuffers]) => {
        const events = [];

        commands.forEach(command => {
          const [noteName, source] = buildSourceNode(command[0], audioBuffers, gainNode);

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
            //source.start(startAt, offset, duration);
            source.start(startAt);
            source.stop(startAt + duration);
          }

          const duration$ = syncWithAudio(audioContext, startAt + duration)
            .ignoreElements()
            .takeUntil(playUntil$)
            .concatWith({});

          const event$ = syncWithAudio(audioContext, startAt).map(when => ({
            noteName,
            when,
            duration$
          }));

          events.push(event$);
        });

        return Observable.merge(...events);
      })
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
