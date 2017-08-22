/* @flow */
import PropTypes from "prop-types";
import React from "react";

import { bindAll } from "lodash";
import classNames from "classnames";
import Link from "./Link";
import NoteLabel from "./NoteLabel";
import PitchGuide from "./PitchGuide";
import SynchronizedVideo from "./SynchronizedVideo";
import colors from "./colors";
import Spinner from "./Spinner";
import styled from "styled-components";

import { formatSeconds } from "./format";

const StyledSpinner = styled(Spinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  margin-left: -25px;
  margin-top: -25px;
  display: block;
  fill: #fff;
`;

type Props = {
  note: string,
  label: string,
  octave: number,
  playbackStartedAt: number,
  spinner: boolean,
  mediaStream?: MediaStream,
  onStartRecording: Function,
  onStopRecording: Function,
  onTrim: Function,
  onClear?: Function,
  videoClip: Object,
  readonly: boolean,
  countdown: number,
  durationRecorded?: number,
  pitchCorrection?: number,
  audioContext: AudioContext
};

export default class VideoCell extends React.Component<Props> {
  constructor() {
    super();
    bindAll(this, "setVideoStream", "onClear", "onTrim");
  }

  setVideoStream(videoEl: ?HTMLVideoElement) {
    if (videoEl && this.props.mediaStream) {
      videoEl.srcObject = this.props.mediaStream;
      videoEl.play();
    }
  }

  onTrim() {
    this.props.onTrim();
  }

  onClear() {
    if (
      window.confirm(this.context.messages["delete-video-clip-confirmation"]())
    ) {
      if (this.props.onClear) this.props.onClear();
    }
  }

  render() {
    let videoEl;
    let countdownEl;
    let stopActionEl;
    let shadeEl;
    let clearEl;
    let trimEl;
    let noteLabelEl;
    let spinnerEl;
    let pitchGuideEl;

    if (this.props.countdown) {
      countdownEl = (
        <div className="countdown-label">
          <div className="text">
            {this.context.messages["start-singing-countdown-prompt"]()}
          </div>
          <div className="number">{this.props.countdown}</div>
          <div>Press ESC to cancel</div>
        </div>
      );
    }

    if (this.props.mediaStream) {
      videoEl = <video key="recorder" muted ref={this.setVideoStream} />;

      if (!this.props.countdown) {
        stopActionEl = (
          <Link onClick={this.props.onStopRecording} className="stop-action">
            <span>
              {this.context.messages["stop-recording-prompt"]()}
            </span>
            <div className="record-status">
              <svg version="1.1" width="10px" height="10px">
                <circle cx="5" cy="5" r="5" fill={colors.red}>
                  <animate
                    attributeType="XML"
                    attributeName="opacity"
                    calcMode="discrete"
                    dur="0.75s"
                    values="0;1"
                    keyTimes="0;0.5"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
              <span className="duration">
                {this.props.durationRecorded != null
                  ? formatSeconds(this.props.durationRecorded)
                  : null}
              </span>
            </div>
          </Link>
        );

        if (this.props.pitchCorrection != null) {
          pitchGuideEl = <PitchGuide value={this.props.pitchCorrection} />;
        }
      }
    } else if (this.props.videoClip) {
      videoEl = (
        <SynchronizedVideo
          key={"playback-" + this.props.videoClip.clipId}
          trimStart={this.props.videoClip.trimStart}
          videoClip={this.props.videoClip}
          audioContext={this.props.audioContext}
          playbackStartedAt={this.props.playbackStartedAt}
        />
      );

      shadeEl = <div className="shade" />;

      if (this.props.playbackStartedAt == null) {
        if (!this.props.readonly) {
          if (this.props.onClear) {
            clearEl = (
              <Link onClick={this.onClear} className="clear-button">
                <svg version="1.1" width="11px" height="11px">
                  <use xlinkHref="#svg-trash" fill="white" />
                </svg>
              </Link>
            );
          }

          trimEl = (
            <Link onClick={this.onTrim} className="trim-button">
              <svg version="1.1" width="16px" height="14px">
                <use xlinkHref="#svg-trim" fill="white" />
              </svg>
            </Link>
          );
        }
      }
    } else {
      const svgId = this.props.playbackStartedAt == null
        ? "#svg-robot-closed"
        : "#svg-robot-open";
      const className = classNames("empty-video", {
        readonly: this.props.readonly,
        "read-write": !this.props.readonly
      });

      let startRecordButton;
      if (!this.props.readonly) {
        startRecordButton = (
          <Link
            onClick={this.props.onStartRecording}
            className="start-record-button"
          >
            <svg
              version="1.1"
              width="20px"
              height="25px"
              stroke={colors.cloudyBlue}
            >
              <use xlinkHref="#svg-camera" />
            </svg>
          </Link>
        );
      }

      videoEl = (
        <div className={className}>
          {startRecordButton}
          <svg version="1.1" width="100px" height="125px" className="robot">
            <use xlinkHref={svgId} />
          </svg>
        </div>
      );
    }

    if (this.props.spinner) {
      spinnerEl = <StyledSpinner size={50} />;
    }

    if (!this.props.mediaStream) {
      noteLabelEl = (
        <NoteLabel note={this.props.label} octave={this.props.octave} />
      );
    }

    return (
      <StyledVideoCell
        className={classNames("video-cell touchable", {
          playing: this.props.playbackStartedAt != null,
          sharp: this.props.note.includes("#")
        })}
        data-note={this.props.note}
      >
        {videoEl}
        {countdownEl}
        {stopActionEl}
        {shadeEl}
        {noteLabelEl}
        {clearEl}
        {trimEl}
        {spinnerEl}
        {pitchGuideEl}
      </StyledVideoCell>
    );
  }
}

VideoCell.contextTypes = {
  messages: PropTypes.object.isRequired
};

VideoCell.propTypes = {
  note: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  octave: PropTypes.number.isRequired,
  playbackStartedAt: PropTypes.number,
  spinner: PropTypes.bool.isRequired,
  mediaStream: PropTypes.object,
  onStartRecording: PropTypes.func,
  onStopRecording: PropTypes.func,
  videoClip: PropTypes.object,
  readonly: PropTypes.bool,
  countdown: PropTypes.number
};

const StyledVideoCell = styled.div`
  background-color: ${colors.blueGrey};
  display: block;
  float: left;
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 3px 10px 0 ${colors.cloudyBlueTwo};
  box-sizing: border-box;
  cursor: pointer;

  // TODO: This z-index seems necessary to get the overflow:hidden to crop
  // the shade element. I'm not sure why this is necessary, because the
  // shade doesn't have a z-index
  z-index: 1;

  .record-status {
    position: absolute;
    left: 5px;
    top: 12.5px;
    font-size: 14px;

    svg {
      margin-right: 5px;
    }
  }

  .shade {
    cursor: pointer;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    opacity: 0.6;
    background-color: ${colors.lightBlueGrey};
    transition: opacity .1s ease-in-out;
  }
  &.playing .shade {
    opacity: 0;
  }

  .clear-button {
    position: absolute;
    bottom: 8px;
    right: 12.5px;
  }

  .trim-button {
    position: absolute;
    top: 8px;
    left: 12.5px;
  }

  a {
    text-decoration: none;
    color: #333;
  }

  .note-label {
    position: absolute;
    bottom: 5px;
    left: 12.5px;
    width: 9.7px;
    text-align: center;
    font-weight: bold;
    font-size: 14px;
    sub {
      margin-left: 2px;
    }
  }
  .countdown-label, .stop-action {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    text-align: center;
    color: white;
    -webkit-text-stroke-width: 1px;
    -webkit-text-stroke-color: #333;
  }
  .countdown-label {
    top: 15px;
    font-weight: bold;
    .text {
      font-size: 17px;
    }
    .number {
      font-size: 23px;
    }
  }
  .stop-action {
    padding-top: 50px;
    font-size: 17px;
    font-weight: bold;
  }

  &.playing {
    background-color: ${colors.purple};
  }

  .empty-video {
    text-align: center;
    display: block;
    height: 100%;
    width: 100%;

    .start-record-button {
      display: black;
      position: absolute;
      top: 5px;
      left: 5px;
      width: 25px;
      height: 25px;
      border: 1px solid ${colors.cloudyBlue};
      border-radius: 5px;
      svg {
        margin-top: 2px;
      }
      &:hover {
        background-color: ${colors.purple};
      }
    }

    svg.robot {
      fill: ${colors.cloudyBlue};
      stroke: ${colors.cloudyBlue};
      margin-top: 13px;
    }
  }

  video {
    height: 100%;
    // TODO: This magic number might need to change if we change the video sizes
    margin-left: -19%;
  }

  .pitch-guide {
    position: absolute;
    bottom: 0;
    left: 5px;
    right: 5px;
  }
`;
