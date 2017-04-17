import React from "react";

import Overlay from "./Overlay";
import Link from "./Link";

import "./ChooseSongOverlay.scss";

class LineItem extends React.Component {
  render() {
    return (
      <li>
        <svg version="1.1" width={21} height={21}>
          <use xlinkHref={this.props.isPlaying ? "#svg-pause" : "#svg-play"} />
        </svg>
        {this.props.title}
        <Link>{this.context.messages["select-action"]()}</Link>
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
          <LineItem title="Happy Birthday" />
          <LineItem title="Jingle Bells" />
          <LineItem title="Mary had a little lamb" />
        </ul>
      </Overlay>
    );
  }
}

ChooseSongOverlay.propTypes = {
  onLogin: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.string.isRequired
};
