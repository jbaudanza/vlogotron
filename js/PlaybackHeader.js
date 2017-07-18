import PropTypes from "prop-types";
import React from "react";
import Link from "./Link";

import PlayButton from "./PlayButton";
import PageHeader from "./PageHeader";

import { formatSeconds } from "./format";
import classNames from "classnames";

import { ShareButtons, generateShareIcon } from "react-share";

const {
  FacebookShareButton,
  GooglePlusShareButton,
  TwitterShareButton
} = ShareButtons;

const FacebookIcon = generateShareIcon("facebook");
const TwitterIcon = generateShareIcon("twitter");
const GooglePlusIcon = generateShareIcon("google");

export default class PlaybackHeader extends React.Component {
  constructor() {
    super();
    this.state = { shareButtonsVisible: false };
    this.toggleShareButtons = this.toggleShareButtons.bind(this);
  }

  toggleShareButtons() {
    this.setState({ shareButtonsVisible: !this.state.shareButtonsVisible });
  }

  render() {
    const title = "vlogotron: remix my face!";

    return (
      <PageHeader>
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
          <Link
            onClick={this.toggleShareButtons}
            className={classNames("action share-action", {
              "toggled-on": this.state.shareButtonsVisible
            })}
          >
            {this.context.messages["share-action"]()}
          </Link>

          <div
            className={classNames("share-buttons-wrapper", {
              visible: this.state.shareButtonsVisible
            })}
          >
            <div className="share-buttons">
              <FacebookShareButton
                url={this.props.shareUrl}
                title={title}
                className="Share__some-network__share-button"
              >
                <FacebookIcon size={25} round />
              </FacebookShareButton>

              <TwitterShareButton
                url={this.props.shareUrl}
                title={title}
                className="Share__some-network__share-button"
              >
                <TwitterIcon size={25} round />
              </TwitterShareButton>

              <GooglePlusShareButton url={this.props.shareUrl}>
                <GooglePlusIcon size={25} round />
              </GooglePlusShareButton>
            </div>
          </div>

          <Link className="action remix-action" {...this.props.remixAction}>
            {this.context.messages["remix-action"]()}
          </Link>
        </div>
      </PageHeader>
    );
  }
}

PlaybackHeader.contextTypes = {
  messages: PropTypes.object.isRequired
};

PlaybackHeader.propTypes = {
  loading: PropTypes.bool.isRequired,
  onClickPlay: PropTypes.func.isRequired,
  onClickPause: PropTypes.func.isRequired,
  remixAction: PropTypes.object.isRequired,
  isPlaying: PropTypes.bool.isRequired
};
