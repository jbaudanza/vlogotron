/* @flow */

import PropTypes from "prop-types";
import * as React from "react";
import styled from "styled-components";

import { Observable } from "rxjs/Observable";

import { map } from "lodash";

import Overlay from "./Overlay";
import Link from "./Link";
import PlayButton from "./PlayButton";

import { songs } from "./song";
import type { Song } from "./song";

import colors from "./colors";
import { startScriptedPlayback } from "./AudioPlaybackEngine";
import type { AudioSourceMap } from "./AudioPlaybackEngine";

import ReactActions from "./ReactActions";
import createControlledComponent from "./createControlledComponent";

const arrowEl = (
  <svg width="8" height="14" viewBox="0 0 8 14">
    <path
      fill="#ADBAC2"
      fillRule="evenodd"
      d="M7.566 7.01a.56.56 0 0 1-.163.395l-5.867 5.942a.568.568 0 0 1-.8.007.561.561 0 0 1-.008-.797l5.48-5.55L.726 1.39A.561.561 0 0 1 .738.594a.568.568 0 0 1 .8.011l5.868 6.013c.106.109.16.25.16.392"
    />
  </svg>
);

const StyledPlayButton = styled(PlayButton)`
  float: left;
  svg {
    border: 1px solid ${colors.purple};
    border-radius: 25px;
    margin-right: 10px;
  }
`;

const StyledLink = styled(Link)`
  font-size: 11px;
  text-decoration: none;
  font-weight: 600;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  color: ${colors.purple};
  float: right;

  span {
    margin-right: 10px
  }
  svg {
    position: relative;
    top: 3px;
  }
`;

const StyledLI = styled.li`
  padding: 18px 0;
  line-height: 21px;
  border-bottom: solid 1px ${colors.whitish};

  &:last-child {
    border-bottom: none;
  }
`;

const StyledUL = styled.ul`
  text-align: left;
  padding: 0;
  color: ${colors.charcoalGrey};
  font-size: 14px;
  font-weight: 500; // Medium
  list-style-type: none;
`;

class LineItem
  extends React.Component<{
    songId: string,
    song: Song,
    premiumAccountStatus: boolean,
    price: number,
    isPlaying: boolean,
    onSelectSong: string => void
  }> {
  constructor(props) {
    super();
    this.onSelectSong = props.onSelectSong.bind(null, props.songId);
    this.onClickPlay = props.onClickPlay.bind(null, props.songId);
    this.onClickPause = props.onClickPause.bind(null, props.songId);
    this.onRequestPurchase = props.onRequestPurchase.bind(null, props.songId);
  }

  onSelectSong: Function;
  onRequestPurchase: Function;
  onClickPlay: Function;
  onClickPause: Function;

  render() {
    let actionLabel;
    let onClick;

    if (this.props.premiumAccountStatus) {
      actionLabel = this.context.messages["select-action"]();
      onClick = this.onSelectSong;
    } else {
      if (this.props.song.premium) {
        actionLabel = new Intl.NumberFormat(this.context.locale, {
          style: "currency",
          currency: "USD"
        }).format(this.props.price / 100);
        onClick = this.onRequestPurchase;
      } else {
        actionLabel = this.context.messages["free-action"]();
        onClick = this.onSelectSong;
      }
    }

    return (
      <StyledLI>
        <StyledPlayButton
          size={21}
          isPlaying={this.props.isPlaying}
          onClickPlay={this.onClickPlay}
          onClickPause={this.onClickPause}
        />
        {this.props.song.title}
        <StyledLink onClick={onClick}>
          <span>
            {actionLabel}
          </span>
          {arrowEl}
        </StyledLink>
      </StyledLI>
    );
  }
}

LineItem.contextTypes = {
  messages: PropTypes.object.isRequired,
  locale: PropTypes.string.isRequired
};

type Props = {
  onSelectSong: Function,
  onClose: string,
  onPlay: Function,
  onPause: Function,
  onRequestPurchase: Function,
  price: number,
  premiumAccountStatus: boolean,
  currentlyPlaying: string
};

class ChooseSongOverlay extends React.Component<Props> {
  render() {
    return (
      <Overlay className="choose-song-overlay" onClose={this.props.onClose}>
        <h1>Choose a song</h1>

        <StyledUL>
          {map(songs, (song, songId: string) => (
            <LineItem
              song={song}
              key={songId}
              songId={songId}
              isPlaying={this.props.currentlyPlaying === songId}
              onSelectSong={this.props.onSelectSong}
              onRequestPurchase={this.props.onRequestPurchase}
              onClickPlay={this.props.onPlay}
              onClickPause={this.props.onPause}
              price={this.props.price}
              premiumAccountStatus={this.props.premiumAccountStatus}
            />
          ))}
        </StyledUL>
      </Overlay>
    );
  }
}

type OuterPropTypes = {
  onSelectSong: string => void,
  onRequestPurchase: string => void,
  onClose: Function,
  price: number,
  audioSources: AudioSourceMap,
  premiumAccountStatus: boolean
};
type ActionTypes = { play$: Observable<string>, pause$: Observable<string> };

function chooseTemplateController(
  props$: Observable<OuterPropTypes>,
  actions: ActionTypes
) {
  const unmount$ = props$.ignoreElements().concatWith(1);

  const currentlyPlaying$ = actions.play$
    .withLatestFrom(props$)
    .switchMap(([songId, props]) => {
      const context = startScriptedPlayback(
        Observable.of(songs[songId].notes),
        songs[songId].bpm,
        0, // startPosition
        props$.map(props => props.audioSources),
        Observable.merge(actions.pause$, actions.play$, unmount$).take(1)
      );

      return Observable.merge(
        Observable.of(songId),
        context.playCommands$.ignoreElements().concatWith(null)
      );
    })
    .startWith(null);

  return Observable.combineLatest(
    currentlyPlaying$,
    props$,
    (currentlyPlaying, props) => ({
      currentlyPlaying,
      onSelectSong: props.onSelectSong,
      onClose: props.onClose,
      onRequestPurchase: props.onRequestPurchase,
      price: props.price,
      premiumAccountStatus: props.premiumAccountStatus
    })
  );
}

export default createControlledComponent(
  chooseTemplateController,
  ChooseSongOverlay,
  ["play", "pause", "close", "select"]
);
