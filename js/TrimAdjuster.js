import React from "react";
import PropTypes from "prop-types";
import { Observable } from "rxjs/Observable";

import styled from "styled-components";

const documentMouseMove$ = Observable.fromEvent(document, "mousemove");
const documentMouseUp$ = Observable.fromEvent(document, "mouseup");

function draw(array, context, width, height) {
  const step = array.length / width;

  const amp = height / 2;

  context.fillStyle = "#a0a7c4";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#4b57a3";

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

const grabberPadding = 2;

const TrimAdjusterWrapper = styled.div`
  position: relative;
  margin: 0 auto;
`;

const Shade = styled.div`
  position: absolute;
  top: ${grabberPadding}px;
  bottom: ${grabberPadding}px;
  background-color: #eee;
  opacity: 0.8;
`;

const grabberWidth = 7;

const Grabber = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: ${grabberWidth}px;
  background-color: #4c59a1;
  border-radius: 2px;
  cursor: pointer;
`;

const Canvas = styled.canvas`
  margin-top: ${grabberPadding}px;
  margin-left: ${grabberWidth}px;
  margin-right: ${grabberWidth}px;
`;

export default class TrimAdjuster extends React.Component {
  constructor(props) {
    super();
    this.setCanvasRef = this.setCanvasRef.bind(this);
    this.onMouseDownStart = this.onMouseDown.bind(
      this,
      this._filteredOnChangeStart.bind(this),
      "right"
    );
    this.onMouseDownEnd = this.onMouseDown.bind(
      this,
      this._filteredOnChangeEnd.bind(this),
      "left"
    );
    this.onKeyDownTrimStart = this.onKeyDown.bind(
      this,
      this._filteredOnChangeStart.bind(this),
      "trimStart"
    );
    this.onKeyDownTrimEnd = this.onKeyDown.bind(
      this,
      this._filteredOnChangeEnd.bind(this),
      "trimEnd"
    );
  }

  _filteredOnChangeStart(value) {
    if (value >= 0 && value < this.props.trimEnd) {
      this.props.onChangeStart(value);
    }
  }

  _filteredOnChangeEnd(value) {
    if (value <= 1 && value > this.props.trimStart) {
      this.props.onChangeEnd(value);
    }
  }

  setCanvasRef(canvasEl) {
    if (canvasEl) {
      const context = canvasEl.getContext("2d");
      const array = this.props.audioBuffer.getChannelData(0);
      draw(array, context, canvasEl.width, canvasEl.height);
    }
  }

  onKeyDown(callback, prop, event) {
    const interval = 0.01;
    if (event.key === "ArrowLeft") {
      callback(this.props[prop] - interval);
    }

    if (event.key === "ArrowRight") {
      callback(this.props[prop] + interval);
    }
  }

  onMouseDown(callback, edge, event) {
    event.preventDefault();
    event.target.focus();

    const rect = event.target.parentNode.getBoundingClientRect();
    const grabberOffset =
      event.target.getBoundingClientRect()[edge] - event.clientX;

    let adjust;
    if (edge === "left") {
      adjust = +grabberWidth;
    } else {
      adjust = -grabberWidth;
    }

    documentMouseMove$
      .takeUntil(documentMouseUp$)
      .map(e => (e.clientX - rect.left + grabberOffset + adjust) / rect.width)
      .subscribe(callback);
  }

  render() {
    const canvasWidth = this.props.width - grabberWidth * 2;
    return (
      <TrimAdjusterWrapper
        style={{ width: this.props.width, height: this.props.height }}
      >
        <Canvas
          width={canvasWidth}
          height={this.props.height - grabberPadding * 2}
          innerRef={this.setCanvasRef}
        />
        <Shade
          style={{
            left: grabberWidth,
            width: canvasWidth * this.props.trimStart
          }}
        />
        <Shade
          style={{
            right: grabberWidth,
            width: canvasWidth * (1 - this.props.trimEnd)
          }}
        />
        <Grabber
          tabIndex={1}
          onKeyDown={this.onKeyDownTrimStart}
          style={{
            right: grabberWidth + canvasWidth * (1 - this.props.trimStart)
          }}
          onMouseDown={this.onMouseDownStart}
        />
        <Grabber
          tabIndex={2}
          onKeyDown={this.onKeyDownTrimEnd}
          style={{ left: grabberWidth + canvasWidth * this.props.trimEnd }}
          onMouseDown={this.onMouseDownEnd}
        />
      </TrimAdjusterWrapper>
    );
  }
}

TrimAdjuster.propTypes = {
  trimStart: PropTypes.number.isRequired,
  trimEnd: PropTypes.number.isRequired,
  onChangeStart: PropTypes.func.isRequired,
  onChangeEnd: PropTypes.func.isRequired
};
