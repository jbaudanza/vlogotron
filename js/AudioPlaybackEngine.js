/* @flow */

import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import { animationFrame } from "rxjs/scheduler/animationFrame";

import audioContext from "./audioContext";
import { playbackSchedule } from "./playbackSchedule";
import { noteToFrequency, shiftFrequency } from "./frequencies";

import { songLengthInBeats, beatsToTimestamp, timestampToBeats } from "./song";
import type { ScheduledNoteList, ScheduledNote } from "./song";

import TrimmedAudioBufferSourceNode from "./TrimmedAudioBufferSourceNode";

type AudioSource = {
  // audioBuffer will be missing if it hasn't finished loading yet
  audioBuffer?: AudioBuffer,
  playbackParams: PlaybackParams
};

export type PlaybackParams = {
  trimStart: number,
  trimEnd: number,
  playbackRate: number,
  gain: number
};

export type UIPlaybackCommand = {
  when: number,
  duration$: Observable<Object>,
  midiNote: number
};

export type AudioSourceMap = { [number]: AudioSource };

// This is the minimum amount of time we will try to schedule audio in the
// future. This is based on the following comment by Chris Wilson:
// https://github.com/WebAudio/web-audio-api/issues/296#issuecomment-257100626
// https://webaudio.github.io/web-audio-api/#widl-BaseAudioContext-baseLatency
const batchTime = audioContext.baseLatency || 2 * 128 / audioContext.sampleRate;

export type LivePlayCommand = {
  play?: number,
  pause?: number
};

export function startLivePlaybackEngine(
  audioSources$: Observable<AudioSourceMap>,
  playCommands$: Observable<LivePlayCommand>,
  subscription: Subscription
) {
  const active: { [number]: Object } = {};

  const stream$ = observableWithGainNode(
    audioContext.destination,
    destinationNode =>
      playCommands$
        .withLatestFrom(audioSources$)
        .map(([cmd, audioSources]): ?UIPlaybackCommand => {
          const when = audioContext.currentTime + batchTime;
          let event = null;

          if (cmd.play) {
            const inputNoteName = cmd.play;
            const midiNote = realizedMidiNote(inputNoteName);
            const node = buildSourceNode(
              midiNote,
              inputNoteName,
              audioSources,
              destinationNode
            );

            if (node) {
              const subject = new Subject();
              active[inputNoteName] = { node, subject };
              node.start(when);

              event = {
                when,
                midiNote,
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

  constructor(destination: AudioNode) {
    this.node = audioContext.createGain();
    this.node.connect(destination);
  }

  unsubscribe() {
    this.node.disconnect();
  }
}

function observableWithGainNode(destination, observableFactory) {
  return Observable.using(
    () => new GainNodeResource(destination),
    resource => observableFactory(resource.node)
  );
}

function isSharp(midiNote: number) {
  return [1, 3, 6, 8, 10].indexOf(midiNote % 12) != -1;
}

function realizedMidiNote(input: number): number {
  return isSharp(input) ? input - 1 : input;
}

function buildSourceNode(
  sourceMidiNote: number,
  requestedMidiNote: number,
  audioSources: AudioSourceMap,
  destinationNode: AudioNode
): TrimmedAudioBufferSourceNode | OscillatorNode {
  const audioSource = audioSources[sourceMidiNote];

  if (audioSource && audioSource.audioBuffer) {
    const audioBuffer = audioSource.audioBuffer;

    // alter playback rate for sharp notes,
    // simply use just intonation for now
    let playbackRate = audioSource.playbackParams.playbackRate;

    playbackRate =
      playbackRate * shiftFrequency(requestedMidiNote - sourceMidiNote);

    const source = new TrimmedAudioBufferSourceNode(
      destinationNode.context,
      audioBuffer,
      {
        ...audioSource.playbackParams,
        playbackRate
      }
    );
    source.connect(destinationNode);

    return source;
  } else {
    const source = destinationNode.context.createOscillator();
    source.type = "square";
    source.frequency.value = noteToFrequency(requestedMidiNote);

    const gainNode = destinationNode.context.createGain();
    gainNode.gain.value = 0.05;
    gainNode.connect(destinationNode);
    source.connect(gainNode);

    return source;
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
  playUntil$: Observable<any>,
  audioDestination: AudioNode
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

  const stream$ = observableWithGainNode(audioDestination, gainNode =>
    commandsWithAudioSources$
      .flatMap(([commands, audioSources]) => {
        scheduleNotesForPlayback(
          playbackStartedAt,
          gainNode,
          bpm,
          commands,
          audioSources
        );

        return uiPlaybackCommandsForNotes(
          playbackStartedAt,
          bpm,
          commands,
          gainNode.context,
          playUntil$
        );
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

function scheduleNotesForPlayback(
  startPlaybackAt: number,
  destination: AudioNode,
  bpm: number,
  notes: ScheduledNoteList,
  audioSources: AudioSourceMap
) {
  const compressor = destination.context.createDynamicsCompressor();
  // TODO: I just copied these values from https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
  // I have no idea if they are good or not.
  compressor.threshold.value = -50;
  compressor.knee.value = 40;
  compressor.ratio.value = 12;
  compressor.attack.value = 0;
  compressor.release.value = 0.25;
  compressor.connect(destination);

  notes.forEach(note => {
    const [startAt, offset, duration] = timelineForNoteSchedule(
      startPlaybackAt,
      bpm,
      note,
      destination.context
    );

    const source = buildSourceNode(
      realizedMidiNote(note[0]),
      note[0],
      audioSources,
      compressor
    );

    if (source) {
      if (offset > 0) {
        console.warn("scheduling playback late.", offset);
      }

      if (source instanceof TrimmedAudioBufferSourceNode) {
        source.start(startAt, offset);
      } else {
        source.start(startAt);
      }
      source.stop(startAt + duration);
    }
  });
}

function timelineForNoteSchedule(
  playbackStartedAt: number,
  bpm: number,
  note: ScheduledNote,
  audioContext: AudioContext
): [number, number, number] {
  let startAt = playbackStartedAt + beatsToTimestamp(note[1], bpm);
  const duration = beatsToTimestamp(note[2], bpm);

  // If our scheduler is firing in time, this condition should never be met. If
  // it does, we try to recover by slicing the buffer up so it still matches
  // the timeline.
  if (audioContext.currentTime > startAt) {
    const offset = audioContext.currentTime - startAt;
    return [
      0, // startAt - immediately
      offset,
      duration - offset
    ];
  } else {
    return [
      startAt,
      0, // offset
      duration
    ];
  }
}

function uiPlaybackCommandsForNotes(
  startPlaybackAt: number,
  bpm: number,
  notes: ScheduledNoteList,
  audioContext: audioContext,
  playUntil$: Observable<any>
): Observable<UIPlaybackCommand> {
  const events = notes.map(note => {
    const [startAt, offset, duration] = timelineForNoteSchedule(
      startPlaybackAt,
      bpm,
      note,
      audioContext
    );

    const duration$ = syncWithAudio(audioContext, startAt + duration)
      .ignoreElements()
      .takeUntil(playUntil$)
      .concatWith({});

    return syncWithAudio(
      audioContext,
      startAt
    ).map((when): UIPlaybackCommand => ({
      midiNote: realizedMidiNote(note[0]),
      when,
      duration$
    }));
  });

  return Observable.merge(...events);
}

export function renderNotesToAudioBuffer(
  bpm: number,
  notes: ScheduledNoteList,
  audioSources: AudioSourceMap
): Promise<AudioBuffer> {
  const length = beatsToTimestamp(songLengthInBeats(notes), bpm);
  const sampleRate = 44100;
  const audioContext = new OfflineAudioContext(
    2,
    sampleRate * length,
    sampleRate
  );

  scheduleNotesForPlayback(
    audioContext.currentTime,
    audioContext.destination,
    bpm,
    notes,
    audioSources
  );

  return audioContext.startRendering();
}
