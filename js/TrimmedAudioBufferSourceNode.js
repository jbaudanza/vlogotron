/* @flow */

import type { PlaybackParams } from "./AudioPlaybackEngine";

export default class TrimmedAudioBufferSourceNode {
  constructor(
    audioContext: AudioContext,
    buffer: AudioBuffer,
    playbackParams: PlaybackParams
  ) {
    this.sourceNode = audioContext.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.playbackRate.value = playbackParams.playbackRate;
    this.playbackParams = playbackParams;

    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = playbackParams.gain;
    this.sourceNode.connect(this.gainNode);

    this.offset = playbackParams.trimStart * this.sourceNode.buffer.duration;
    this.duration =
      playbackParams.trimEnd * this.sourceNode.buffer.duration - this.offset;

    this.playbackParams = playbackParams;
  }

  playbackParams: PlaybackParams;
  sourceNode: AudioBufferSourceNode;
  gainNode: GainNode;
  offset: number;
  duration: number;

  connect(destination: AudioNode) {
    this.gainNode.connect(destination);
  }

  disconnect() {
    this.gainNode.disconnect();
  }

  start(when: number) {
    this.sourceNode.start(when, this.offset, this.duration);
  }

  stop(when?: number) {
    this.sourceNode.stop(when);
  }
}
