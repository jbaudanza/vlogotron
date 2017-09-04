/* @flow */

import * as React from "react";

import detectPitch from "detect-pitch";
import asyncDetectPitch from "./asyncDetectPitch";

import { frequencyToNote } from "./frequencies";
import type { PlaybackParams } from "./AudioPlaybackEngine";
import Canvas from "./Canvas";

type Props = {
  className?: string,
  width: number,
  height: number,
  audioBuffer: AudioBuffer,
  gain: number
};

export default function AudioBufferView(props: Props) {
  return (
    <Canvas
      className={props.className}
      input={props.audioBuffer}
      width={props.width}
      height={props.height}
      drawFunction={drawAmplitude}
    />
  );
}

export function drawAmplitude(
  context: CanvasRenderingContext2D,
  audioBuffer: AudioBuffer,
  width: number,
  height: number
) {
  // TODO: It would be more correct to mix all channels together
  const array = audioBuffer.getChannelData(0);

  const step = array.length / width;

  const amp = height / 2;

  // Clear
  context.fillStyle = "#a0a7c4";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#4b57a3";
  // XXX: Left off here. Try to come up with a good color scheme for the
  // combined control
  //context.fillStyle = "#eeeeee";

  // i - index into canvas
  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;

    // j - index into data array
    for (let j = 0; j < Math.ceil(step); j++) {
      const sample = array[Math.floor(i * step) + j];

      if (sample < min) min = sample;

      if (sample > max) max = sample;
    }
    context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }
}
