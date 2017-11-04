declare class MediaRecorder {
  constructor(mediaStream: MediaStream): MediaRecorder;
  start(): void;
  stop(): void;
  requestData(): void;
}

declare class AudioProcessingEvent extends Event {
  playbackTime: number;
  inputBuffer: AudioBuffer;
  outputBuffer: AudioBuffer;
}
