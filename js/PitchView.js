/* @flow */

import * as React from "react";

import { Observable } from "rxjs/Observable";

import asyncDetectPitch from "./asyncDetectPitch";
import { frequencyToNote } from "./frequencies";
import createControlledComponent from "./createControlledComponent";
import Canvas from "./Canvas";

type OuterProps = {
  className?: string,
  width: number,
  height: number,
  audioBuffer: AudioBuffer,
  playbackRate: number
};

type InnerProps = {
  className?: string,
  width: number,
  height: number,
  pitches: Array<?number>
};

function sampleBlocks(audioBuffer: AudioBuffer): Array<Float32Array> {
  // TODO: It would be more correct to mix all channels together
  const array = audioBuffer.getChannelData(0);

  const blockSize = audioBuffer.sampleRate * 0.100;
  const blocks = [];
  for (let i = 0; i + blockSize < array.length; i += blockSize) {
    blocks.push(array.subarray(i, i + blockSize));
  }
  return blocks;
}

function sampleCountToPitch(sampleCount, sampleRate, playbackRate): ?number {
  if (sampleCount === 0) {
    return null;
  } else {
    return sampleRate / sampleCount * playbackRate;
  }
}

function controller(props$: Observable<OuterProps>): Observable<InnerProps> {
  const audioBuffer$ = props$
    .map(props => props.audioBuffer)
    .distinctUntilChanged();

  const threshold = 0.5;
  const sampleRate = 44100; // TODO: Pull this off the audioBuffer

  const sampleCounts$ = audioBuffer$
    .map(sampleBlocks)
    .switchMap(blocks =>
      Promise.all(blocks.map(block => asyncDetectPitch(block, threshold)))
    )
    .startWith([]);

  return Observable.combineLatest(props$, sampleCounts$, (props, counts) => ({
    ...props,
    pitches: counts.map(count =>
      sampleCountToPitch(
        count,
        props.audioBuffer.sampleRate,
        props.playbackRate
      )
    )
  }));
}

function drawPitch(
  context: CanvasRenderingContext2D,
  input: Array<?number>,
  width: number,
  height: number
) {
  // Clear
  context.fillStyle = "#a0a7c4";
  context.fillRect(0, 0, width, height);

  const octaveSize = 12;

  const blockWidth = width / input.length;
  const scaleY = height / octaveSize;

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

  for (let i = 0; i < input.length; i++) {
    if (input[i] != null) {
      const midiNote = frequencyToNote(input[i]) % octaveSize;

      const x = i * blockWidth;
      const y = height - midiNote * scaleY;

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + blockWidth, y);
      context.stroke();
    }
  }
}

function PitchView(props: InnerProps) {
  return (
    <Canvas
      width={props.width}
      height={props.height}
      input={props.pitches}
      drawFunction={drawPitch}
    />
  );
}

export default createControlledComponent(controller, PitchView);
