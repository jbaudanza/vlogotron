/* @flow */

import detectPitch from "detect-pitch";

self.onmessage = onMessage;

export type WorkerRequest = {
  messageId: number,
  block: Float32Array,
  threshold: number
};

export type WorkerResponse = {
  messageId: number,
  result?: number,
  error?: Object
};

function onMessage(event: { data: WorkerRequest }) {
  const request: WorkerRequest = event.data;

  try {
    const result = detectPitch(request.block, request.threshold);
    const response: WorkerResponse = {
      messageId: request.messageId,
      result
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      messageId: request.messageId,
      error
    };
    self.postMessage(response);
  }
}
