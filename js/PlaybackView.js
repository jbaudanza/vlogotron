import PropTypes from 'prop-types';
import React from "react";

import { bindAll, bindKey, isEmpty } from "lodash";
import classNames from "classnames";

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
    const loadingAsBool = !isEmpty(this.props.loading);

    const className = classNames("page-vertical-wrapper", {
      "loading-finished": !loadingAsBool
    });

    return (
      <div className={className}>

        <div className="mobile-header">
          <Link href="#nav" className="navigation-link">
            <svg version="1.1" width="20px" height="14px">
              <use xlinkHref="#svg-hamburger" />
            </svg>
          </Link>
          VLOGOTRON
        </div>

        <PlaybackHeader
          isPlaying={this.props.isPlaying}
          songTitle={this.props.songTitle}
          loading={loadingAsBool}
          songLength={this.props.songLength}
          authorName={this.props.authorName}
          shareUrl={this.props.shareUrl}
          playbackPositionInSeconds={this.props.playbackPositionInSeconds}
          onClickPlay={this.props.actions.callbacks.onPlay}
          onClickPause={this.props.actions.callbacks.onPause}
          remixAction={{
            href: `/songs/${this.props.songId}/remix/record-videos`
          }}
        />

        <div className="page-content">
          <div className="instructions">
            <span className="mobile-text">
              {this.context.messages["mobile-playback-instructions"]()}
            </span>
            <span className="desktop-text">
              {this.context.messages["desktop-playback-instructions"]()}
            </span>
          </div>
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
  loading: PropTypes.object.isRequired,
  videoClips: PropTypes.object.isRequired,
  playCommands$: PropTypes.object.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  songLength: PropTypes.number.isRequired,
  shareUrl: PropTypes.string.isRequired,
  songTitle: PropTypes.string.isRequired
};

PlaybackView.contextTypes = {
  messages: PropTypes.object.isRequired
};
