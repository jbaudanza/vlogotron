/* @flow */

import * as React from "react";
import {
  PageHeader,
  PageHeaderAction,
  HeaderLeft,
  HeaderMiddle,
  HeaderRight,
  PlaybackControls,
  SongTitleAndAuthor
} from "./PageHeader";

import { bindAll } from "lodash";
import classNames from "classnames";
import Message from "./Message";

import { ShareButtons, generateShareIcon } from "react-share";

const {
  FacebookShareButton,
  GooglePlusShareButton,
  TwitterShareButton
} = ShareButtons;

const FacebookIcon = generateShareIcon("facebook");
const TwitterIcon = generateShareIcon("twitter");
const GooglePlusIcon = generateShareIcon("google");

type Props = {
  shareUrl: string,
  loading: boolean,
  onClickPlay: Function,
  onClickPause: Function,
  remixAction: Object,
  isPlaying: boolean,
  songTitle: string,
  authorName: string,
  songLength: number,
  playbackPositionInSeconds: number
};

type State = {
  shareButtonsVisible: boolean
};

export default class PlaybackHeader extends React.Component<Props, State> {
  constructor() {
    super();
    this.state = { shareButtonsVisible: false };
    bindAll(this, "toggleShareButtons");
  }

  toggleShareButtons() {
    this.setState({ shareButtonsVisible: !this.state.shareButtonsVisible });
  }

  render() {
    const title = "vlogotron: remix my face!";

    return (
      <PageHeader>
        <HeaderLeft>
          <PlaybackControls
            songLength={this.props.songLength}
            playbackPositionInSeconds={this.props.playbackPositionInSeconds}
            onClickPlay={this.props.onClickPlay}
            onClickPause={this.props.onClickPause}
            isPlaying={this.props.isPlaying}
            loading={this.props.loading}
          />

        </HeaderLeft>

        <HeaderMiddle>
          <SongTitleAndAuthor
            songTitle={this.props.songTitle}
            authorName={this.props.authorName}
          />
        </HeaderMiddle>

        <HeaderRight>
          <div className="actions">
            <PageHeaderAction
              onClick={this.toggleShareButtons}
              className={classNames("share-action", {
                "toggled-on": this.state.shareButtonsVisible
              })}
            >
              <Message msgKey="share-action" />
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

            <PageHeaderAction
              className="remix-action"
              {...this.props.remixAction}
            >
              <Message msgKey="remix-action" />
            </PageHeaderAction>
          </div>
        </HeaderRight>
      </PageHeader>
    );
  }
}
