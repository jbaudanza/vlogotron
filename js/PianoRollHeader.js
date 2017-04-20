import React from "react";

import { range, bindAll } from "lodash";
import Link from "./Link";
import PlayButton from './PlayButton';

import "./PianoRollHeader.scss";

export default class PianoRollHeader extends React.Component {
  constructor() {
    super();
    bindAll(this, "onChangeSelect", "onChangeBpm");
  }

  onChangeSelect(event) {
    this.props.onChangeCellsPerBeat(parseInt(event.target.value));
  }

  onChangeBpm(event) {
    this.props.onChangeBpm(parseInt(event.target.value));
  }

  render() {
    return (
      <div className="piano-roll-header">
        <div className="left-side">
          <PlayButton size={28} isPlaying={this.props.isPlaying} onClickPlay={this.props.onClickPlay} onClickPause={this.props.onClickPause} />

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
          <Link
            enabled={this.props.undoEnabled}
            onClick={this.props.onUndo}
            className="action"
          >
            {this.context.messages["undo-action"]()}
          </Link>
          <Link
            enabled={this.props.redoEnabled}
            onClick={this.props.onRedo}
            className="action"
          >
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
          <select
            className="action"
            value={this.props.bpm}
            onChange={this.onChangeBpm}
          >
            {range(60, 190, 10).map(bpm => (
              <option value={bpm} key={bpm}>
                {this.context.messages["bpm-with-number"]({ BPM: bpm })}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }
}

PianoRollHeader.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

PianoRollHeader.propTypes = {
  bpm: React.PropTypes.number.isRequired,
  onChangeBpm: React.PropTypes.func.isRequired,
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
