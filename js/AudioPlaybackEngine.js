/* @flow */

import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import { animationFrame } from "rxjs/scheduler/animationFrame";

import audioContext from "./audioContext";
import { playbackSchedule } from "./playbackSchedule";
import { noteLabelsToMidi, noteToFrequency } from "./frequencies";

import { songLengthInBeats, beatsToTimestamp, timestampToBeats } from "./song";
import type { ScheduledNoteList } from "./song";

import TrimmedAudioBufferSourceNode from "./TrimmedAudioBufferSourceNode";

export type AudioSource = {
  // audioBuffer will be missing if it hasn't finished loading yet
  audioBuffer?: AudioBuffer,
  trimStart: number,
  trimEnd: number,
  videoClipId: string
};

export type UIPlaybackCommand = {
  when: number,
  duration$: Observable<Object>,
  noteName: string
};

export type AudioSourceMap = { [string]: AudioSource };

// This is the minimum amount of time we will try to schedule audio in the
// future. This is based on the following comment by Chris Wilson:
// https://github.com/WebAudio/web-audio-api/issues/296#issuecomment-257100626
// https://webaudio.github.io/web-audio-api/#widl-BaseAudioContext-baseLatency
const batchTime = audioContext.baseLatency || 2 * 128 / audioContext.sampleRate;

export type LivePlayCommand = {
  play?: string,
  pause?: string
};

export function startLivePlaybackEngine(
  audioSources$: Observable<AudioSourceMap>,
  playCommands$: Observable<LivePlayCommand>,
  subscription: Subscription
) {
  const active = {};

  const stream$ = observableWithGainNode(destinationNode =>
    playCommands$
      .withLatestFrom(audioSources$)
      .map(([cmd, audioSources]): ?UIPlaybackCommand => {
        const when = audioContext.currentTime + batchTime;
        let event = null;

        if (cmd.play) {
          const inputNoteName = cmd.play;
          const [noteName, node] = buildSourceNode(
            cmd.play,
            audioSources,
            destinationNode
          );

          if (node) {
            const subject = new Subject();
            active[inputNoteName] = { node, subject };
            node.start(when);

            event = {
              when,
              noteName: inputNoteName,
              duration$: subject.asObservable()
            };
          }
        }

        if (cmd.pause && active[cmd.pause]) {
          const inputNoteName = cmd.pause;
          active[inputNoteName].node.stop(when);
          active[inputNoteName].subject.next({});
          active[inputNoteName].subject.complete();
          delete active[inputNoteName];
        }

        return event;
      })
      .nonNull()
  ).publish();

  subscription.add(stream$.connect());

  return stream$;
}

class GainNodeResource {
  node: AudioNode;

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

function buildSourceNode(
  requestedNoteName,
  audioSources: AudioSourceMap,
  destinationNode
) {
  const isSharp = requestedNoteName.indexOf("#") >= 0;
  const noteName = requestedNoteName.replace("#", "");

  const audioSource = audioSources[noteName];

  if (audioSource && audioSource.audioBuffer) {
    const source = new TrimmedAudioBufferSourceNode(
      audioContext,
      audioSource.audioBuffer,
      audioSource.trimStart,
      audioSource.trimEnd
    );
    source.connect(destinationNode);

    // alter playback rate for sharp notes,
    // simply use just intonation for now
    const pitchRatio = isSharp ? 1.05946 : 1.0;
    source.source.playbackRate.value = pitchRatio;

    return [noteName, source];
  } else {
    const midiNote = noteLabelsToMidi[requestedNoteName];
    const source = audioContext.createOscillator();
    source.type = "square";
    source.frequency.value = noteToFrequency(midiNote);

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
  notes$: Observable<ScheduledNoteList>,
  bpm: number,
  startPosition: number,
  audioSources$: Observable<AudioSourceMap>,
  playUntil$: Observable<any>
) {
  const truncatedNotes$ = notes$.map(notes =>
    notes
      .filter(note => note[1] >= startPosition)
      .map(note => [note[0], note[1] - startPosition, note[2]])
  );

  type BeatWindow = [number, number];

  function pickNotesForBeatWindow(
    beatWindow: BeatWindow,
    notes: ScheduledNoteList
  ) {
    const [beatFrom, beatTo] = beatWindow;
    return notes.filter(note => note[1] >= beatFrom && note[1] < beatTo);
  }

  // TODO: 125ms is a long time, but using batchTime instead leads to late
  // playbacks. Why is this? Probably because it takes too long for the
  // audioScheduler to startup.
  const playbackStartedAt = audioContext.currentTime + 0.125;

  // Returns the time window (in beats) that need to be scheduled
  function makeBeatWindow(lastWindow, playbackUntilTimestamp): BeatWindow {
    return [
      lastWindow[1],
      timestampToBeats(playbackUntilTimestamp - playbackStartedAt, bpm)
    ];
  }

  // TODO: If the song isn't going to change, we don't need the playback
  // scheduler.
  const commandsWithAudioSources$ = playbackSchedule(audioContext)
    .scan(makeBeatWindow, [0, 0])
    .withLatestFrom(truncatedNotes$)
    // TODO: This really should be takeUntil with a predicate function, but
    // that doesn't exist. Right now we're emitting one more than we need to.
    .takeWhile(
      ([beatWindow, notes]) => beatWindow[0] < songLengthInBeats(notes)
    )
    .map(([beatWindow, notes]) => pickNotesForBeatWindow(beatWindow, notes))
    .withLatestFrom(audioSources$);

  const stream$ = observableWithGainNode(gainNode =>
    commandsWithAudioSources$
      .flatMap(([commands, audioSources]) => {
        const events = [];

        commands.forEach(command => {
          const [noteName, source] = buildSourceNode(
            command[0],
            audioSources,
            gainNode
          );

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

          const event$ = syncWithAudio(
            audioContext,
            startAt
          ).map((when): UIPlaybackCommand => ({
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
