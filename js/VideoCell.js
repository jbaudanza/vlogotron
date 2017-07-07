import PropTypes from "prop-types";
import React from "react";
import ReactDOM from "react-dom";

import { bindAll } from "lodash";
import classNames from "classnames";
import Link from "./Link";
import NoteLabel from "./NoteLabel";
import PitchGuide from "./PitchGuide";
import SynchronizedVideo from "./SynchronizedVideo";

import { findWrappingLink } from "./domutils";
import { formatSeconds } from "./format";

import "./VideoCell.scss";

export default class VideoCell extends React.Component {
  constructor() {
    super();
    bindAll(this, "setVideoStream", "onClear", "onTrim");
  }

  setVideoStream(videoEl) {
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
      this.props.onClear();
    }
  }

  render() {
    let videoEl;
    let countdownEl;
    let stopActionEl;
    let shadeEl;
    let clearEl;
    let trimEl;
    let spinnerEl;
    let pitchGuideEl;

    if (this.props.countdown) {
      countdownEl = (
        <div className="countdown-label">
          <div className="text">
            {this.context.messages["start-singing-countdown-prompt"]()}
          </div>
          <div className="number">{this.props.countdown}</div>
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
                <circle cx="5" cy="5" r="5">
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
                {formatSeconds(this.props.durationRecorded)}
              </span>
            </div>
          </Link>
        );

        pitchGuideEl = <PitchGuide value={this.props.pitchCorrection} />;
      }
    } else if (this.props.videoClip) {
      videoEl = (
        <SynchronizedVideo
          key={"playback-" + this.props.videoClip.clipId}
          videoClip={this.props.videoClip}
          audioContext={this.props.audioContext}
          playbackStartedAt={this.props.playbackStartedAt}
        />
      );

      shadeEl = <div className="shade" />;

      if (this.props.playbackStartedAt == null) {
        if (!this.props.readonly) {
          clearEl = (
            <Link onClick={this.onClear} className="clear-button">
              <svg version="1.1" width="11px" height="11px">
                <use xlinkHref="#svg-trash" fill="white" />
              </svg>
            </Link>
          );

          trimEl = (
            <Link onClick={this.onTrim} className="trim-button">
              <svg version="1.1" width="11px" height="11px">
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

      videoEl = (
        <Link
          className={className}
          onClick={this.props.onStartRecording}
          enabled={!this.props.mediaStream && !this.props.readonly}
        >
          <svg
            version="1.1"
            width="100px"
            height="125px"
            className="background"
          >
            <use xlinkHref={svgId} />
          </svg>
          <span className="tip">
            {this.context.messages["record-videos-tip-short"]()}
          </span>
        </Link>
      );
    }

    if (this.props.spinner) {
      spinnerEl = (
        <svg version="1.1" width="50px" height="50px" className="spinner">
          <use xlinkHref="#svg-spinner" />
        </svg>
      );
    }

    return (
      <div
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
        <NoteLabel note={this.props.label} octave={this.props.octave} />
        {clearEl}
        {trimEl}
        {spinnerEl}
        {pitchGuideEl}
      </div>
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
