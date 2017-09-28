/* @flow */

import PropTypes from "prop-types";
import * as React from "react";

import type { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import { bindAll, bindKey, find } from "lodash";
import classNames from "classnames";

import Link from "./Link";
import PlaybackHeader from "./PlaybackHeader";
import VideoGrid from "./VideoGrid";
import SubHeader from "./SubHeader";
import Message from "./Message";

import type { NoteConfiguration } from "./mediaLoading";
import type { PlaybackParams } from "./AudioPlaybackEngine";

type Props = {
  actions: Object,
  loading: Object,
  noteConfiguration: NoteConfiguration,
  playCommands$: Observable<Object>,
  isPlaying: boolean,
  songLength: number,
  origin: string,
  location: Location,
  songTitle: string,
  songId: string,
  onPlay: Function,
  onPause: Function,
  authorName: string,
  playbackPositionInSeconds: number
};

export default class PlaybackView extends React.Component<Props> {
  constructor() {
    super();
    bindAll(this, "bindVideoGrid");
  }

  subscription: Subscription;

  bindVideoGrid(component: ?VideoGrid) {
    if (component) {
      this.subscription = component.playCommands$$.subscribe(
        this.props.actions.subjects.playCommands$$
      );
    } else {
      if (this.subscription) this.subscription.unsubscribe();
    }
  }

  render() {
    // This is true if any of the values are true
    const loadingAsBool = !!find(this.props.loading);

    const shareUrl = this.props.origin + this.props.location.pathname;

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
          shareUrl={shareUrl}
          playbackPositionInSeconds={this.props.playbackPositionInSeconds}
          onClickPlay={this.props.onPlay}
          onClickPause={this.props.onPause}
          remixAction={{
            href: `/songs/${this.props.songId}/remix/record-videos`
          }}
        />

        <div className="page-content">
          <SubHeader>
            <span className="mobile-text">
              <Message msgKey="mobile-playback-instructions" />
            </span>
            <span className="desktop-text">
              <Message msgKey="desktop-playback-instructions" />
            </span>
          </SubHeader>
          <VideoGrid
            readonly
            noteConfiguration={this.props.noteConfiguration}
            loading={this.props.loading}
            playCommands$={this.props.playCommands$}
            ref={this.bindVideoGrid}
          />
        </div>
      </div>
    );
  }
}
