import React from "react";
import PropTypes from "prop-types";
import { Observable } from "rxjs/Observable";

import { times } from "lodash";
import styled from "styled-components";

import { findWrappingClass } from "./domutils";

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

const grabberPadding = 4;

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

const grabberWidth = 9;

const Grabber = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: ${grabberWidth}px;
  background-color: #4c59a1;
  border-radius: 2px;
  cursor: pointer;
`;

const GrabberLine = styled.div`
  position: absolute;
  top: 20px;
  left: ${props => 2 + props.count * 2}px;
  width: 1px;
  height: 9px;
  background-color: #fff;
`;

const Canvas = styled.canvas`
  margin-top: ${grabberPadding}px;
`;

function constrainRange(number) {
  if (number < 0) return 0;
  if (number > 1) return 1;
  return number;
}

export default class TrimAdjuster extends React.Component {
  constructor(props) {
    super();
    this.setCanvasRef = this.setCanvasRef.bind(this);
    this.onMouseDownStart = this.onMouseDown.bind(
      this,
      this._filteredOnChangeStart.bind(this),
      "left"
    );
    this.onMouseDownEnd = this.onMouseDown.bind(
      this,
      this._filteredOnChangeEnd.bind(this),
      "right"
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
    value = constrainRange(value);

    if (value >= 0 && value < this.props.trimEnd) {
      this.props.onChangeStart(value);
    }
  }

  _filteredOnChangeEnd(value) {
    value = constrainRange(value);

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
    let interval;

    if (event.shiftKey) {
      interval = 0.10;
    } else {
      interval = 0.01;
    }

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

    const grabberEl = findWrappingClass(event.target, "grabber");

    const rect = this.wrapperEl.getBoundingClientRect();

    let grabberOffset;
    let adjust;

    grabberOffset = -(event.clientX - grabberEl.getBoundingClientRect()[edge]);

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
    return (
      <TrimAdjusterWrapper
        style={{ width: this.props.width, height: this.props.height }}
        innerRef={el => this.wrapperEl = el}
      >
        <Canvas
          width={this.props.width}
          height={this.props.height - grabberPadding * 2}
          innerRef={this.setCanvasRef}
        />
        <Shade
          style={{
            left: 0,
            width: this.props.width * this.props.trimStart
          }}
        />
        <Shade
          style={{
            right: 0,
            width: this.props.width * (1 - this.props.trimEnd)
          }}
        />
        <Grabber
          tabIndex={1}
          className="grabber"
          onKeyDown={this.onKeyDownTrimStart}
          style={{
            right: this.props.width * (1 - this.props.trimStart)
          }}
          onMouseDown={this.onMouseDownStart}
        >
          <GrabberLine count={0} />
          <GrabberLine count={1} />
          <GrabberLine count={2} />
        </Grabber>
        <Grabber
          tabIndex={2}
          className="grabber"
          onKeyDown={this.onKeyDownTrimEnd}
          style={{ left: this.props.width * this.props.trimEnd }}
          onMouseDown={this.onMouseDownEnd}
        >
          <GrabberLine count={0} />
          <GrabberLine count={1} />
          <GrabberLine count={2} />
        </Grabber>
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
