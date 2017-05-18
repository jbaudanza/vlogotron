import React from "react";
import Link from "./Link";

import PlayButton from "./PlayButton";

function noop() {}

import { formatSeconds } from "./format";

export default class PlaybackHeader extends React.Component {
  render() {
    return (
      <div className="page-header">
        <PlayButton
          size={32}
          onClickPlay={this.props.onClickPlay}
          onClickPause={this.props.onClickPause}
          isPlaying={this.props.isPlaying}
          enabled={!this.props.loading}
        />

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
          <Link className="action" {...this.props.remixAction}>
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
  loading: React.PropTypes.bool.isRequired,
  onClickPlay: React.PropTypes.func.isRequired,
  onClickPause: React.PropTypes.func.isRequired,
  remixAction: React.PropTypes.object.isRequired,
  isPlaying: React.PropTypes.bool.isRequired
};
