/* @flow */

import * as React from "react";
import { isEqual, omit } from "lodash";

type CanvasDrawFunction<Input> = (
  CanvasRenderingContext2D,
  Input,
  number,
  number
) => void;

type CanvasProps<Input> = {
  input: Input,
  className?: string,
  innerRef?: (el: ?HTMLCanvasElement) => void,
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
    if (this.props.innerRef) this.props.innerRef(canvasEl);

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
    if (!isEqual(prevProps.input, this.props.input)) {
      this.draw();
    }
  }

  render() {
    const props = omit(this.props, "drawFunction", "input", "innerRef");

    return <canvas ref={this.setCanvasRef} {...props} />;
  }
}
