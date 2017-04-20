import React from "react";

import { map } from "lodash";

import Overlay from "./Overlay";
import Link from "./Link";
import PlayButton from "./PlayButton";

import { songs } from "./song";

import "./ChooseSongOverlay.scss";

class LineItem extends React.Component {
  constructor(props) {
    super();
    this.onSelect = props.onSelect.bind(null, props.song);
    this.onClickPlay = props.onClickPlay.bind(null, props.songId);
    this.onClickPause = props.onClickPause.bind(null, props.songId);
  }

  render() {
    return (
      <li>
        <PlayButton
          size={21}
          isPlaying={this.props.isPlaying}
          onClickPlay={this.onClickPlay}
          onClickPause={this.onClickPause}
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
          {map(songs, (song, songId) => (
            <LineItem
              song={song}
              key={songId}
              songId={songId}
              isPlaying={this.props.currentlyPlayingTemplate === songId}
              onSelect={this.props.onSelect}
              onClickPlay={this.props.onClickPlay}
              onClickPause={this.props.onClickPause}
            />
          ))}
        </ul>
      </Overlay>
    );
  }
}

ChooseSongOverlay.propTypes = {
  currentlyPlayingTemplate: React.PropTypes.string,
  onSelect: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.string.isRequired,
  onClickPlay: React.PropTypes.func.isRequired,
  onClickPause: React.PropTypes.func.isRequired
};
