// Some parts of the WebAudio API aren't yet defined in flow's bom.js

declare class AudioProcessingEvent extends Event {
  playbackTime: number;
  inputBuffer: AudioBuffer;
  outputBuffer: AudioBuffer;
}

declare class OfflineAudioContext extends AudioContext {
  constructor(channels: number, length: number, sampleRate: number): OfflineAudioContext;

  startRendering(): Promise<AudioBuffer>;
}
