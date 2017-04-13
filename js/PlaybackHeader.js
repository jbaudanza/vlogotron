import React from "react";
import Link from "./Link";

function noop() {}

import { formatSeconds } from "./format";

export default class PlaybackHeader extends React.Component {
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
      <div className="page-header">
        <Link onClick={this.onClickPlay} className="play-button">
          <svg version="1.1" width={32} height={32}>
            <use
              xlinkHref={this.props.isPlaying ? "#svg-pause" : "#svg-play"}
            />
          </svg>
        </Link>

        <div className="song-info">
          <div className="top">
            <span className="song-title">{this.props.songTitle}</span>
            <span className="by"> by </span>
            <span className="song-author">{this.props.authorName}</span>
          </div>
          <div className="bottom">
            {formatSeconds(this.props.playbackPositionInSeconds)}
            {" "}
            |
            {" "}
            {formatSeconds(this.props.songLength)}
          </div>
        </div>

        <div className="actions">
          <Link className="action" onClick={noop}>
            {this.context.messages["share-action"]()}
          </Link>
          <Link className="action" onClick={noop}>
            {this.context.messages["remix-action"]()}
          </Link>
        </div>
      </div>
    );
  }
}

PlaybackHeader.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

PlaybackHeader.propTypes = {
  onClickPlay: React.PropTypes.func.isRequired,
  onClickPause: React.PropTypes.func.isRequired,
  isPlaying: React.PropTypes.bool.isRequired
};
