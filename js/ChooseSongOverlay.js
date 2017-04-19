import React from "react";

import { map } from "lodash";

import Overlay from "./Overlay";
import Link from "./Link";
import { songs } from "./song";

import "./ChooseSongOverlay.scss";

class LineItem extends React.Component {
  constructor(props) {
    super();
    this.onSelect = props.onSelect.bind(null, props.song);
  }

  render() {
    return (
      <li>
        <svg version="1.1" width={21} height={21}>
          <use xlinkHref={this.props.isPlaying ? "#svg-pause" : "#svg-play"} />
        </svg>
        {this.props.title}
        <Link onClick={this.onSelect}>
          {this.context.messages["select-action"]()}
        </Link>
      </li>
    );
  }
}

LineItem.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

export default class ChooseSongOverlay extends React.Component {
  render() {
    return (
      <Overlay className="choose-song-overlay" onClose={this.props.onClose}>
        <h1>Choose a song</h1>
        <ul className="song-list">
          {map(songs, song => (
            <LineItem {...song} onSelect={this.props.onSelect} />
          ))}
        </ul>
      </Overlay>
    );
  }
}

ChooseSongOverlay.propTypes = {
  onSelect: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.string.isRequired
};
