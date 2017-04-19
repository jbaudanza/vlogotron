import React from "react";

import Link from "./Link";

import "./PianoRollHeader.scss";

export default class PianoRollHeader extends React.Component {
  constructor() {
    super();
    this.onClickPlay = this.onClickPlay.bind(this);
    this.onChangeSelect = this.onChangeSelect.bind(this);
  }

  onClickPlay() {
    if (this.props.isPlaying) {
      this.props.onClickPause();
    } else {
      this.props.onClickPlay();
    }
  }

  onChangeSelect(event) {
    this.props.onChangeCellsPerBeat(parseInt(event.target.value));
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

          <Link href="/song-editor#choose-song" className="song-chooser">
            <svg version="1.1" width={18} height={16}>
              <use xlinkHref="#svg-soundwave" />
            </svg>
            {this.context.messages["song-chooser-prompt"]()}
          </Link>
        </div>
        <div className="right-side">
          <Link enabled={this.props.undoEnabled} onClick={this.props.onUndo} className="action">
            {this.context.messages["undo-action"]()}
          </Link>
          <Link enabled={this.props.redoEnabled} onClick={this.props.onRedo} className="action">
            {this.context.messages["redo-action"]()}
          </Link>
          <Link onClick={this.props.onReset} className="action">
            {this.context.messages["reset-action"]()}
          </Link>
          <select
            className="action"
            value={this.props.cellsPerBeat}
            onChange={this.onChangeSelect}
          >
            <option value="16">
              {this.context.messages["sixteenth-notes"]()}
            </option>
            <option value="8">{this.context.messages["eighth-notes"]()}</option>
            <option value="4">
              {this.context.messages["quarter-notes"]()}
            </option>
            <option value="2">{this.context.messages["half-notes"]()}</option>
            <option value="1">{this.context.messages["whole-notes"]()}</option>
          </select>
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
  onChangeCellsPerBeat: React.PropTypes.func.isRequired,
  onReset: React.PropTypes.func.isRequired,
  onUndo: React.PropTypes.func.isRequired,
  cellsPerBeat: React.PropTypes.number.isRequired,
  isRecording: React.PropTypes.bool.isRequired,
  isPlaying: React.PropTypes.bool.isRequired,
  onClickPlay: React.PropTypes.func.isRequired,
  onClickPause: React.PropTypes.func.isRequired,
  undoEnabled: React.PropTypes.bool.isRequired,
  redoEnabled: React.PropTypes.bool.isRequired
};
