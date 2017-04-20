import React from "react";

import { map } from "lodash";

import Overlay from "./Overlay";
import Link from "./Link";
import PlayButton from "./PlayButton";

import { songs } from "./song";

import "./ChooseSongOverlay.scss";

function noop() {}

class LineItem extends React.Component {
  constructor(props) {
    super();
    this.onSelect = props.onSelect.bind(null, props.song);
  }

  render() {
    return (
      <li>
        <PlayButton
          size={21}
          isPlaying={false}
          onClickPlay={noop}
          onClickPause={noop}
        />
        {this.props.song.title}
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
          {map(songs, (song, i) => (
            <LineItem song={song} key={i} onSelect={this.props.onSelect} />
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
