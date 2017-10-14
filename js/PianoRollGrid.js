/* @flow */

import React from "react";
import makeGestureStream from "./makeGestureStream";

import {
  cellHeight,
  beatWidth,
  beatToWidth,
  widthToBeat
} from "./PianoRollGeometry";

import type { GridSelection } from "./PianoRoll";
import colors from "./colors";

import Canvas from "./Canvas";

type Props = {
  cellsPerBeat: number,
  totalBeats: number,
  totalNotes: number,
  selection?: GridSelection
};

function drawFunction(ctx, props, width, height) {
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = colors.darkTwo;
  ctx.lineWidth = 1;

  for (let i = 0; i < props.totalNotes; i++) {
    ctx.beginPath();
    const y = i * cellHeight + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const totalCells = props.totalBeats * props.cellsPerBeat;
  const cellWidth = beatWidth / props.cellsPerBeat;

  for (let i = 0; i < totalCells; i++) {
    ctx.beginPath();
    // TODO: needs to take cellsPerBeat into account
    const x = i * cellWidth + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  const selection = props.selection;
  if (selection != null) {
    const selectionWidth = beatToWidth(selection.start.column);

    // TODO: This second if is for flow, and kind of silly. see if you can
    // clean this up
    if (selection != null) {
      ctx.beginPath();
      ctx.rect(
        selectionWidth + 0.5,
        selection.start.column * cellHeight,
        selectionWidth + 0.5,
        selection.end.column * cellHeight
      );
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function bindEvents(canvasEl) {
  console.log(bindEvents, canvasEl);
  if (canvasEl) {
    const gestures$ = makeGestureStream(canvasEl);
    gestures$.debug("gestures").subscribe();
  }
}

export default function PianoRollGrid(props: Props) {
  return (
    <Canvas
      input={props}
      innerRef={bindEvents}
      drawFunction={drawFunction}
      height={props.totalNotes * cellHeight}
      width={beatToWidth(props.totalBeats)}
    />
  );
}
