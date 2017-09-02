/* @flow */

import DetectPitchWorker
// $FlowFixMe - Flow gets confused by worker-loader
  from "worker-loader?inline&fallback=false!./detectPitchWorker.js";

const worker = new DetectPitchWorker();
worker.onmessage = onWorkerMessage;
let workerCounter = 0;
const workerPromises = {};

import type { WorkerRequest, WorkerResponse } from "./detectPitchWorker";

export default function asyncDetectPitch(
  block: Float32Array,
  threshold: number
): Promise<number> {
  const messageId = ++workerCounter;

  return new Promise((resolve, reject) => {
    workerPromises[messageId] = { resolve, reject };

    const data: WorkerRequest = { messageId, block, threshold };
    worker.postMessage(data);
  });
}

function onWorkerMessage(event: MessageEvent & { data: WorkerResponse }) {
  const response: WorkerResponse = event.data;

  if (response.error) {
    workerPromises[response.messageId].reject(response.error);
  } else {
    workerPromises[response.messageId].resolve(response.result);
  }

  delete workerPromises[response.messageId];
}
