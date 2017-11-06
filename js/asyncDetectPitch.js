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
  const messageId = event.data.messageId;

  if (event.data.error) {
    workerPromises[messageId].reject(event.data.error);
  } else {
    workerPromises[messageId].resolve(event.data.result);
  }

  delete workerPromises[messageId];
}
