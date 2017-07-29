import PropTypes from "prop-types";
import React from "react";
import PageHeaderAction from "./PageHeaderAction";

import PageHeader from "./PageHeader";

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
      <PageHeader
        songTitle={this.props.songTitle}
        authorName={this.props.authorName}
        songLength={this.props.songLength}
        playbackPositionInSeconds={this.props.playbackPositionInSeconds}
        onClickPlay={this.props.onClickPlay}
        onClickPause={this.props.onClickPause}
        isPlaying={this.props.isPlaying}
        loading={this.props.loading}
      >
        <div className="actions">
          <PageHeaderAction
            onClick={this.toggleShareButtons}
            className={classNames("share-action", {
              "toggled-on": this.state.shareButtonsVisible
            })}
          >
            {this.context.messages["share-action"]()}
          </PageHeaderAction>

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

          <PageHeaderAction className="remix-action" {...this.props.remixAction}>
            {this.context.messages["remix-action"]()}
          </PageHeaderAction>
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
