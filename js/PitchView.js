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
  playbackRate: number,
  targetNote: number
};

type InnerProps = {
  className?: string,
  width: number,
  height: number,
  frequencies: Array<?number>,
  targetNote: number
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
    frequencies: counts.map(count =>
      sampleCountToPitch(
        count,
        props.audioBuffer.sampleRate,
        props.playbackRate
      )
    )
  }));
}

type DrawPitchInput = {
  frequencies: Array<?number>,
  targetNote: number,
  colors: {
    backgroundColor: string,
    targetNoteColor: string,
    otherNoteColor: string,
    targetLineColor: string
  }
};

function drawPitch(
  context: CanvasRenderingContext2D,
  input: DrawPitchInput,
  width: number,
  height: number
) {
  // Clear
  context.fillStyle = input.colors.backgroundColor;
  context.fillRect(0, 0, width, height);

  const octaveSize = 12;

  const blockWidth = width / input.frequencies.length;
  const scaleY = height / octaveSize;

  context.lineWidth = 1;
  context.lineCap = "square";

  const targetNote = input.targetNote % octaveSize;

  function noteToY(note) {
    const diff = targetNote - octaveSize / 2;
    return height - (note - diff) % octaveSize * scaleY;
  }

  const targetY = noteToY(targetNote);
  context.strokeStyle = input.colors.targetLineColor;
  context.shadowColor = "transparent";
  context.beginPath();
  context.moveTo(0, targetY);
  context.lineTo(width, targetY);
  context.stroke();

  for (let i = 0; i < input.frequencies.length; i++) {
    const frequency = input.frequencies[i];
    if (frequency != null) {
      const midiNote = frequencyToNote(frequency) % octaveSize;

      const diff = Math.abs(midiNote - targetNote);
      if (diff < 0.5) {
        context.lineWidth = 2;
        context.strokeStyle = input.colors.targetNoteColor;
        context.shadowColor = input.colors.targetNoteColor;
        context.shadowBlur = 5;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
      } else {
        context.lineWidth = 1;
        context.strokeStyle = input.colors.otherNoteColor;
        context.shadowColor = "transparent";
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
      }

      const x = i * blockWidth;
      const y = noteToY(midiNote);

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + blockWidth, y);
      context.stroke();
    }
  }
}

function PitchView(props: InnerProps) {
  const input = {
    frequencies: props.frequencies,
    targetNote: props.targetNote,
    colors: {
      backgroundColor: "#eeeeee",
      targetNoteColor: "#a0a7c4",
      otherNoteColor: "#a0a7c4",
      targetLineColor: "#cdcdcd"
    }
  };

  return (
    <Canvas
      width={props.width}
      height={props.height}
      input={input}
      drawFunction={drawPitch}
    />
  );
}

export default createControlledComponent(controller, PitchView);
