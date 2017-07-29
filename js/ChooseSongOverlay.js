import PropTypes from "prop-types";
import React from "react";
import styled from "styled-components";

import { Observable } from "rxjs/Observable";

import { map } from "lodash";

import Overlay from "./Overlay";
import Link from "./Link";
import PlayButton from "./PlayButton";

import { songs } from "./song";
import { startScriptedPlayback } from "./AudioPlaybackEngine";

import "./ChooseSongOverlay.scss";

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

const StyledLink = styled(Link)`
  span {
    margin-right: 10px
  }
  svg {
    position: relative;
    top: 3px;
  }
`;

class LineItem extends React.Component {
  constructor(props) {
    super();
    this.onSelect = props.onSelect.bind(null, props.song);
    this.onClickPlay = props.onClickPlay.bind(null, props.songId);
    this.onClickPause = props.onClickPause.bind(null, props.songId);
  }

  render() {
    let actionLabel;

    if (this.props.premiumAccount) {
      actionLabel = this.context.messages["select-action"]();
    } else {
      if (this.props.song.premium) {
        actionLabel = new Intl.NumberFormat(this.context.locale, {
          style: "currency",
          currency: "USD"
        }).format(this.props.price / 100);
      } else {
        actionLabel = this.context.messages["free-action"]();
      }
    }

    return (
      <li>
        <PlayButton
          size={21}
          isPlaying={this.props.isPlaying}
          onClickPlay={this.onClickPlay}
          onClickPause={this.onClickPause}
        />
        {this.props.song.title}
        <StyledLink onClick={this.onSelect}>
          <span>
            {actionLabel}
          </span>
          {arrowEl}
        </StyledLink>
      </li>
    );
  }
}

LineItem.contextTypes = {
  messages: PropTypes.object.isRequired,
  locale: PropTypes.string.isRequired
};

LineItem.propTypes = {
  premiumAccount: PropTypes.bool.isRequired,
  price: PropTypes.number.isRequired,
  song: PropTypes.object.isRequired
};

class ChooseSongOverlay extends React.Component {
  render() {
    return (
      <Overlay className="choose-song-overlay" onClose={this.props.onClose}>
        <h1>Choose a song</h1>

        <ul className="song-list">
          {map(songs, (song, songId) => (
            <LineItem
              song={song}
              key={songId}
              songId={songId}
              isPlaying={this.props.currentlyPlaying === songId}
              onSelect={this.props.onSelect}
              onClickPlay={this.props.onPlay}
              onClickPause={this.props.onPause}
              price={this.props.price}
              premiumAccount={this.props.premiumAccount}
            />
          ))}
        </ul>
      </Overlay>
    );
  }
}

ChooseSongOverlay.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.string.isRequired,
  onPlay: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  price: PropTypes.number.isRequired,
  premiumAccount: PropTypes.bool.isRequired
};

function chooseTemplateController(props$, actions) {
  const unmount$ = props$.ignoreElements().concatWith(1);

  const currentlyPlaying$ = actions.play$
    .withLatestFrom(props$)
    .switchMap(([songId, props]) => {
      const context = startScriptedPlayback(
        Observable.of(songs[songId].notes),
        props.bpm,
        0,
        props.media.audioSources$,
        Observable.merge(actions.pause$, actions.play$, unmount$).take(1)
      );

      return Observable.merge(
        Observable.of(songId),
        context.playCommands$.ignoreElements().concatWith(null)
      );
    })
    .startWith(null);

  return currentlyPlaying$.withLatestFrom(
    props$,
    (currentlyPlaying, props) => ({
      currentlyPlaying,
      onSelect: props.onSelect,
      onClose: props.onClose,
      price: props.price,
      premiumAccount: props.premiumAccount
    })
  );
}

export default createControlledComponent(
  chooseTemplateController,
  ChooseSongOverlay,
  ["play", "pause", "close", "select"]
);
