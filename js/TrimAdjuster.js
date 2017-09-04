/* @flow */

import * as React from "react";

import PropTypes from "prop-types";
import { Observable } from "rxjs/Observable";

import { times } from "lodash";
import styled from "styled-components";

import { findWrappingClass } from "./domutils";

import type { PlaybackParams } from "./AudioPlaybackEngine";

import AudioBufferView from "./AudioBufferView";

const documentMouseMove$ = Observable.fromEvent(document, "mousemove");
const documentMouseUp$ = Observable.fromEvent(document, "mouseup");

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

const StyledAudioBufferView = styled(AudioBufferView)`
  margin-top: ${grabberPadding}px;
`;

function constrainRange(number) {
  if (number < 0) return 0;
  if (number > 1) return 1;
  return number;
}

type Props = {
  playbackParams: PlaybackParams,
  onChangeStart: number => void,
  onChangeEnd: number => void,
  width: number,
  height: number,
  audioBuffer: AudioBuffer
};

export default class TrimAdjuster extends React.Component<Props> {
  constructor() {
    super();
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
    this.setWrapperRef = this.setWrapperRef.bind(this);
  }

  onMouseDownStart: MouseEvent => void;
  onMouseDownEnd: MouseEvent => void;
  onKeyDownTrimStart: KeyboardEvent => void;
  onKeyDownTrimEnd: KeyboardEvent => void;
  setWrapperRef: ?HTMLElement => void;
  wrapperEl: ?HTMLElement;

  _filteredOnChangeStart(value: number) {
    value = constrainRange(value);

    if (value >= 0 && value < this.props.playbackParams.trimEnd) {
      this.props.onChangeStart(value);
    }
  }

  _filteredOnChangeEnd(value: number) {
    value = constrainRange(value);

    if (value <= 1 && value > this.props.playbackParams.trimStart) {
      this.props.onChangeEnd(value);
    }
  }

  onKeyDown(callback: Function, prop: string, event: KeyboardEvent) {
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

  onMouseDown(callback: Function, edge: "left" | "right", event: MouseEvent) {
    event.preventDefault();

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    target.focus();

    const grabberEl = findWrappingClass(target, "grabber");

    if (this.wrapperEl == null || grabberEl == null) return;

    const rect = this.wrapperEl.getBoundingClientRect();

    let grabberOffset;
    let adjust;

    let edgeValue;
    if (edge === "left") {
      edgeValue = grabberEl.getBoundingClientRect().left;
    } else {
      edgeValue = grabberEl.getBoundingClientRect().right;
    }

    grabberOffset = -(event.clientX - edgeValue);

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

  setWrapperRef(el: ?HTMLElement) {
    this.wrapperEl = el;
  }

  render() {
    return (
      <TrimAdjusterWrapper
        style={{ width: this.props.width, height: this.props.height }}
        innerRef={this.setWrapperRef}
      >
        <StyledAudioBufferView
          width={this.props.width}
          height={this.props.height - grabberPadding * 2}
          gain={this.props.playbackParams.gain}
          audioBuffer={this.props.audioBuffer}
        />
        <Shade
          style={{
            left: 0,
            width: this.props.width * this.props.playbackParams.trimStart
          }}
        />
        <Shade
          style={{
            right: 0,
            width: this.props.width * (1 - this.props.playbackParams.trimEnd)
          }}
        />
        <Grabber
          tabIndex={1}
          className="grabber"
          onKeyDown={this.onKeyDownTrimStart}
          style={{
            right: this.props.width * (1 - this.props.playbackParams.trimStart)
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
          style={{ left: this.props.width * this.props.playbackParams.trimEnd }}
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
