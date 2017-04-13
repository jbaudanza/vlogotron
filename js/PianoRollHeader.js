import React from "react";

import Link from "./Link";

import "./PianoRollHeader.scss";

export default class PianoRollHeader extends React.Component {
  constructor() {
    super();
    this.onClickPlay = this.onClickPlay.bind(this);
  }

  onClickPlay() {
    if (this.props.isPlaying) {
      this.props.onClickPause();
    } else {
      this.props.onClickPlay();
    }
  }

  render() {
    return (
      <div className="piano-roll-header">
        <div className="left-side">
          <Link onClick={this.onClickPlay} className="play-button">
            <svg version="1.1" width={28} height={28}>
              <use
                xlinkHref={this.props.isPlaying ? "#svg-pause" : "#svg-play"}
              />
            </svg>
          </Link>

          <Link onClick={null} className="record-button">
            <svg version="1.1" width={28} height={28}>
              <use
                xlinkHref={
                  this.props.isRecording ? "#svg-record-active" : "#svg-record"
                }
              />
            </svg>
          </Link>

          <div className="song-chooser">
            <svg version="1.1" width={18} height={16}>
              <use xlinkHref="#svg-soundwave" />
            </svg>
            {this.context.messages["song-chooser-prompt"]()}
          </div>
        </div>
        <div className="right-side">
          <Link className="action">
            {this.context.messages["tips-action"]()}
          </Link>
          <Link className="action">
            {this.context.messages["reset-action"]()}
          </Link>
          <Link className="action">
            {this.context.messages["quarter-notes"]()}
          </Link>
          <Link className="action">
            {this.context.messages["bpm-with-number"]({ BPM: 120 })}
          </Link>
        </div>
      </div>
    );
  }
}

PianoRollHeader.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

PianoRollHeader.propTypes = {
  isRecording: React.PropTypes.bool.isRequired,
  isPlaying: React.PropTypes.bool.isRequired,
  onClickPlay: React.PropTypes.func.isRequired,
  onClickPause: React.PropTypes.func.isRequired
};
