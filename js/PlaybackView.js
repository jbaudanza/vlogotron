import React from "react";

import { bindAll, bindKey, isEmpty } from "lodash";

import Link from "./Link";
import PlaybackHeader from "./PlaybackHeader";
import VideoGrid from "./VideoGrid";

export default class PlaybackView extends React.Component {
  constructor() {
    super();
    bindAll(this, "bindVideoGrid");
  }

  bindVideoGrid(component) {
    if (component) {
      this.subscription = component.playCommands$$.subscribe(
        this.props.actions.subjects.playCommands$$
      );
    } else {
      if (this.subscription) this.subscription.unsubscribe();
    }
  }

  render() {
    return (
      <div className="page-vertical-wrapper">

        <div className="mobile-header">
          VLOGOTRON
          <Link href="#" className="navigation-link">
            <svg version="1.1" width="20px" height="14px">
              <use xlinkHref="#svg-hamburger" />
            </svg>
          </Link>
        </div>

        <PlaybackHeader
          className="playback-page"
          isPlaying={this.props.isPlaying}
          songTitle={this.props.songTitle}
          loading={!isEmpty(this.props.loading)}
          songLength={this.props.songLength}
          authorName={this.props.authorName}
          playbackPositionInSeconds={this.props.playbackPositionInSeconds}
          onClickPlay={this.props.actions.callbacks.onPlay}
          onClickPause={this.props.actions.callbacks.onPause}
          remixAction={{
            href: `/songs/${this.props.songId}/remix/record-videos`
          }}
        />

        <div className="page-content">
          <VideoGrid
            readonly
            videoClips={this.props.videoClips}
            loading={this.props.loading}
            playCommands$={this.props.playCommands$}
            ref={this.bindVideoGrid}
          />
        </div>
      </div>
    );
  }
}

PlaybackView.propTypes = {
  loading: React.PropTypes.object.isRequired,
  videoClips: React.PropTypes.object.isRequired,
  playCommands$: React.PropTypes.object.isRequired,
  isPlaying: React.PropTypes.bool.isRequired,
  songLength: React.PropTypes.number.isRequired,
  songTitle: React.PropTypes.string.isRequired
};
