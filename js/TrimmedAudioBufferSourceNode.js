/* @flow */

export default class TrimmedAudioBufferSourceNode {
  constructor(
    audioContext: AudioContext,
    buffer: AudioBuffer,
    trimStart: number,
    trimEnd: number
  ) {
    this.source = audioContext.createBufferSource();
    this.source.buffer = buffer;

    this.offset = trimStart * buffer.duration;
    this.duration = trimEnd * buffer.duration - this.offset;
  }

  duration: number;
  offset: number;
  source: AudioBufferSourceNode;

  connect(destination: AudioNode) {
    this.source.connect(destination);
  }

  disconnect() {
    this.source.disconnect();
  }

  start(when: number) {
    this.source.start(when, this.offset, this.duration);
  }

  stop(when?: number) {
    this.source.stop(when);
  }
}
