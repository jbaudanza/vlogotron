import PropTypes from "prop-types";
import React from "react";

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

class LineItem extends React.Component {
  constructor(props) {
    super();
    this.onSelect = props.onSelect.bind(null, props.song);
    this.onClickPlay = props.onClickPlay.bind(null, props.songId);
    this.onClickPause = props.onClickPause.bind(null, props.songId);
  }

  render() {
    return (
      <li>
        <PlayButton
          size={21}
          isPlaying={this.props.isPlaying}
          onClickPlay={this.onClickPlay}
          onClickPause={this.onClickPause}
        />
        {this.props.song.title}
        <Link onClick={this.onSelect}>
          {this.context.messages["select-action"]()}
        </Link>
      </li>
    );
  }
}

LineItem.contextTypes = {
  messages: PropTypes.object.isRequired
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
  onPause: PropTypes.func.isRequired
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
      onClose: props.onClose
    })
  );
}

export default createControlledComponent(
  chooseTemplateController,
  ChooseSongOverlay,
  ["play", "pause", "close", "select"]
);
