/* @flow */

import * as React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import colors from "./colors";

import { formatSeconds } from "./format";

import PlayButton from "./PlayButton";
import EditableTitle from "./EditableTitle";

// XXX: Duplicated in Page.scss
const headerHeight = 63;

const PageHeaderWrapper = styled.div.attrs({ className: "page-header" })`
  padding: 0 24px;

  flex: 0 0 ${headerHeight}px;

  background-color: ${colors.purple};
  display: flex;

  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
`;

const playButtonSize = 32;

const HeaderLeft = styled.div`
  display: flex;

  .play-button {
    margin-top: ${headerHeight / 2 - playButtonSize / 2}px;
  }
`;

const VerticallyCenteredText = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const HeaderMiddle = styled(VerticallyCenteredText)`
  flex-grow: 1;
  margin-left: 12px;

  text-align: center;

  font-weight: 500; // medium
  color: white;

  .author-name {
    font-size: 12px;
  }

  .by {
    opacity: 0.5;
  }
`;

const HeaderRight = styled.div`
`;

const PlaybackPositionWrapper = styled(VerticallyCenteredText)`
  opacity: 0.7;
  font-size: 12px;
  font-weight: 500;
  span { margin: 0 5px; }
`;

export default class PageHeader extends React.Component<$FlowFixMeProps> {
  render() {
    return (
      <PageHeaderWrapper className={this.props.className}>
        <HeaderLeft>
          <PlayButton
            size={playButtonSize}
            onClickPlay={this.props.onClickPlay}
            onClickPause={this.props.onClickPause}
            isPlaying={this.props.isPlaying}
            enabled={!this.props.loading}
          />
          <PlaybackPositionWrapper>
            <div>
              <span>
                {formatSeconds(this.props.playbackPositionInSeconds)}
              </span>
              |
              <span>{formatSeconds(this.props.songLength)}</span>
            </div>
          </PlaybackPositionWrapper>
        </HeaderLeft>

        <HeaderMiddle>
          {
            <EditableTitle
              value={this.props.songTitle}
              onChange={this.props.onChangeTitle}
            />
          }
          <div className="author-name">
            <span className="by"> by </span>
            <span className="song-author">{this.props.authorName}</span>
          </div>
        </HeaderMiddle>

        <HeaderRight>
          {this.props.children}
        </HeaderRight>
      </PageHeaderWrapper>
    );
  }
}

PageHeader.contextTypes = {
  messages: PropTypes.object.isRequired
};

PageHeader.propTypes = {
  songTitle: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  playbackPositionInSeconds: PropTypes.number.isRequired,
  songLength: PropTypes.number.isRequired,
  loading: PropTypes.bool.isRequired,
  onClickPlay: PropTypes.func.isRequired,
  onClickPause: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool.isRequired
};
