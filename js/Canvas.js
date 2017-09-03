/* @flow */

import * as React from "react";

type CanvasDrawFunction<Input> = (
  CanvasRenderingContext2D,
  Input,
  number,
  number
) => void;

type CanvasProps<Input> = {
  input: Input,
  className?: string,
  width: number,
  height: number,
  drawFunction: CanvasDrawFunction<Input>
};

export default class Canvas<Input> extends React.Component<CanvasProps<Input>> {
  constructor() {
    super();
    this.setCanvasRef = this.setCanvasRef.bind(this);
  }

  canvasEl: ?HTMLCanvasElement;
  setCanvasRef: (canvasEl: ?HTMLCanvasElement) => void;

  setCanvasRef(canvasEl: ?HTMLCanvasElement) {
    if (canvasEl) {
      this.canvasEl = canvasEl;
      this.draw();
    }
  }

  draw() {
    if (this.canvasEl) {
      this.props.drawFunction(
        this.canvasEl.getContext("2d"),
        this.props.input,
        this.props.width,
        this.props.height
      );
    }
  }

  componentDidUpdate(prevProps: CanvasProps<Input>) {
    if (prevProps.input !== this.props.input) {
      this.draw();
    }
  }

  render() {
    return (
      <canvas
        className={this.props.className}
        ref={this.setCanvasRef}
        width={this.props.width}
        height={this.props.height}
      />
    );
  }
}
