declare class MediaRecorder {
  constructor(mediaStream: MediaStream): MediaRecorder;
  start(): void;
  stop(): void;
  requestData(): void;
}
