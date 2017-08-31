/* @flow */

import * as React from "react";

import detectPitch from "detect-pitch";

import { frequencyToNote } from "./frequencies";

type Props = {
  className?: string,
  width: number,
  height: number,
  audioBuffer: AudioBuffer,
  onDraw: (
    context: CanvasRenderingContext2D,
    array: Float32Array,
    width: number,
    height: number
  ) => void
};

export default class AudioBufferView extends React.Component<Props> {
  constructor() {
    super();
    this.setCanvasRef = this.setCanvasRef.bind(this);
  }

  setCanvasRef: (canvasEl: ?HTMLCanvasElement) => void;

  setCanvasRef(canvasEl: ?HTMLCanvasElement) {
    if (canvasEl) {
      const context = canvasEl.getContext("2d");
      const array = this.props.audioBuffer.getChannelData(0);
      this.props.onDraw(context, array, this.props.width, this.props.height);
    }
  }

  render() {
    return (
      <canvas
        ref={this.setCanvasRef}
        className={this.props.className}
        width={this.props.width}
        height={this.props.height}
      />
    );
  }
}

function mapToPitchBlocks(array: Float32Array): Array<?number> {
  const threshold = 0.5;
  const sampleRate = 44100; // TODO: Pull this off the audioContext
  const blockSize = sampleRate * 0.100;

  const blocks = [];
  for (let i = 0; i + blockSize < array.length; i += blockSize) {
    blocks.push(array.subarray(i, i + blockSize));
  }

  return blocks
    .map(block => detectPitch(block, threshold))
    .map(result => (result === 0 ? null : sampleRate / result));
}

export function drawPitch(
  context: CanvasRenderingContext2D,
  input: Float32Array,
  width: number,
  height: number
) {
  const array = mapToPitchBlocks(input);

  const octaveSize = 12;

  const blockWidth = width / array.length;
  const scaleY = height / octaveSize;

  // context.fillStyle = "#a0a7c4";
  // context.fillRect(0, 0, width, height);

  context.lineWidth = 1;
  context.lineCap = "square";

  const targetY = height - 9 * scaleY;
  //context.strokeStyle = "#bc1838";  //red
  context.strokeStyle = "#29bdec"; // green
  context.beginPath();
  context.moveTo(0, targetY);
  context.lineTo(width, targetY);
  context.stroke();

  context.strokeStyle = "#4b57a3";

  for (let i = 0; i < array.length; i++) {
    if (array[i] != null) {
      const midiNote = frequencyToNote(array[i]) % octaveSize;

      const x = i * blockWidth;
      const y = height - midiNote * scaleY;

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + blockWidth, y);
      context.stroke();
    }
  }
}

export function drawAmplitude(
  context: CanvasRenderingContext2D,
  array: Float32Array,
  width: number,
  height: number
) {
  const step = array.length / width;

  const amp = height / 2;

  // context.fillStyle = "#a0a7c4";
  // context.fillRect(0, 0, width, height);

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

export function drawBoth(
  context: CanvasRenderingContext2D,
  input: Float32Array,
  width: number,
  height: number
) {
  // Clear
  context.fillStyle = "#a0a7c4";
  context.fillRect(0, 0, width, height);

  drawAmplitude(context, input, width, height);
  //drawPitch(context, input, width, height);
}
