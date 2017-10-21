/* @flow */

import PropTypes from "prop-types";
import React from "react";

import { range, bindAll } from "lodash";
import Link from "./Link";
import ActionLink from "./ActionLink";

import PlayButton from "./PlayButton";

import styled from "styled-components";
import colors from "./colors";

// $FlowFixMe - scss not supported
import "./PianoRollHeader.scss";

const HeaderActionLink = styled(ActionLink)`
  margin-right: 5px;
  margin-left: 5px;
  background-color: ${colors.duskThree};

  &.disabled {
    opacity: 0.2;
  }
`;

const ToggleLink = styled(HeaderActionLink)`
  color: ${props => (props.toggledOn ? colors.duskThree : "white")};
  background-color: ${props => (props.toggledOn ? "white" : colors.duskThree)};
`;

const StyledSelect = ActionLink.withComponent("select").extend`
  background-color: ${colors.duskThree};
  border: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
`;

type Props = {
  bpm: number,
  onChangeBpm: number => void,
  onChangeCellsPerBeat: number => void,
  cellsPerBeat: number,
  isPlaying: boolean,
  onClickPlay: () => void,
  onClickPause: () => void,
  onReset: () => void,
  onUndo: () => void,
  onRedo: () => void,
  onStartSelection: () => void,
  onStopSelection: () => void,
  undoEnabled: boolean,
  redoEnabled: boolean,
  isSelecting: boolean
};

export default class PianoRollHeader extends React.Component<Props> {
  constructor() {
    super();
    bindAll(this, "onChangeSelect", "onChangeBpm", "onToggleSelecting");
  }

  onChangeSelect(event: Event & { target: HTMLSelectElement }) {
    this.props.onChangeCellsPerBeat(parseInt(event.target.value));
  }

  onChangeBpm(event: Event & { target: HTMLSelectElement }) {
    this.props.onChangeBpm(parseInt(event.target.value));
  }

  onToggleSelecting() {
    if (this.props.isSelecting) {
      this.props.onStopSelection();
    } else {
      this.props.onStartSelection();
    }
  }

  render() {
    return (
      <div className="piano-roll-header">
        <div className="left-side">
          <PlayButton
            size={28}
            enabled={true}
            isPlaying={this.props.isPlaying}
            onClickPlay={this.props.onClickPlay}
            onClickPause={this.props.onClickPause}
          />

          <Link href="#choose-song" className="song-chooser">
            <svg version="1.1" width={18} height={16}>
              <use xlinkHref="#svg-soundwave" />
            </svg>
            {this.context.messages["song-chooser-prompt"]()}
          </Link>
        </div>
        <div className="right-side">
          <ToggleLink
            className="action"
            toggledOn={this.props.isSelecting}
            onClick={this.onToggleSelecting}
          >
            Select
          </ToggleLink>
          <HeaderActionLink
            enabled={this.props.undoEnabled}
            onClick={this.props.onUndo}
            className="action"
          >
            {this.context.messages["undo-action"]()}
          </HeaderActionLink>
          <HeaderActionLink
            enabled={this.props.redoEnabled}
            onClick={this.props.onRedo}
            className="action"
          >
            {this.context.messages["redo-action"]()}
          </HeaderActionLink>
          <HeaderActionLink onClick={this.props.onReset} className="action">
            {this.context.messages["reset-action"]()}
          </HeaderActionLink>
          <StyledSelect
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
          </StyledSelect>
          <StyledSelect
            className="action"
            value={this.props.bpm}
            onChange={this.onChangeBpm}
          >
            {range(60, 190, 10).map(bpm => (
              <option value={bpm} key={bpm}>
                {this.context.messages["bpm-with-number"]({ BPM: bpm })}
              </option>
            ))}
          </StyledSelect>
        </div>
      </div>
    );
  }
}

PianoRollHeader.contextTypes = {
  messages: PropTypes.object.isRequired
};
