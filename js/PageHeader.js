/* @flow */

import * as React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import colors from "./colors";

import { formatSeconds } from "./format";

import PlayButton from "./PlayButton";
import EditableTitle from "./EditableTitle";
import ActionLink from "./ActionLink";

// XXX: Duplicated in Page.scss
const headerHeight = 63;

const sidePadding = 24;

export const PageHeader = styled.div.attrs({ className: "page-header" })`
  padding: 0 ${sidePadding}px;
  position: relative;

  flex: 0 0 ${headerHeight}px;

  background-color: ${colors.purple};
  display: flex;

  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
`;

const playButtonSize = 32;

export const HeaderLeft = styled.div`
  display: flex;
  position: absolute;
  left: ${sidePadding}px;
  top: 0;
  bottom: 0;
`;

const VerticallyCenteredText = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const HeaderMiddle = styled.div`
  flex-grow: 1;
  margin-left: 12px;
`;

export const HeaderRight = styled.div`
`;

const PlaybackPositionWrapper = styled(VerticallyCenteredText)`
  opacity: 0.7;
  font-size: 12px;
  font-weight: 500;
  span { margin: 0 5px; }
`;

const StyledPlayButton = styled(PlayButton)`
  margin-top: ${headerHeight / 2 - playButtonSize / 2}px;
`;

const PlaybackControlsWrapper = styled.div`
  display: flex;
`;

type PlaybackControlProps = {
  onClickPlay: Function,
  onClickPause: Function,
  isPlaying: boolean,
  loading: boolean,
  songLength: number,
  playbackPositionInSeconds: number
};

export class PlaybackControls extends React.Component<PlaybackControlProps> {
  render() {
    return (
      <PlaybackControlsWrapper>
        <StyledPlayButton
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
      </PlaybackControlsWrapper>
    );
  }
}

type SongTitleAndAuthorProps = {
  songTitle: string,
  authorName?: string,
  onChangeTitle?: Function
};

const SongTitleAndAuthorWrapper = styled(VerticallyCenteredText)`
  text-align: center;
  height: 100%;

  font-weight: 500; // medium
  color: white;

  .author-name {
    font-size: 12px;
  }

  .by {
    opacity: 0.5;
  }
`;

export function SongTitleAndAuthor(props: SongTitleAndAuthorProps) {
  return (
    <SongTitleAndAuthorWrapper>
      {<EditableTitle value={props.songTitle} onChange={props.onChangeTitle} />}
      {props.authorName
        ? <div className="author-name">
            <span className="by"> by </span>
            <span className="song-author">{props.authorName}</span>
          </div>
        : null}
    </SongTitleAndAuthorWrapper>
  );
}

const primaryCss = `
  background-color: white;
  color: ${colors.duskyBlue};
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: grayscale;
`;

export const PageHeaderAction = ActionLink.extend`
  margin: 0 7px;
  margin-top: ${headerHeight / 2 - 14}px;
  border: solid 1px white;
  white-space: nowrap;
  display: block;
  float: left;

  ${props => (props.primary ? primaryCss : null)}
`;
