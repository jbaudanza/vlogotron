import PropTypes from 'prop-types';
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

export default class ChooseSongOverlay extends React.Component {
  constructor() {
    super();

    this.actions = new ReactActions(["play", "pause", "unmount"]);

    this.state = {
      currentyPlaying: null
    };
  }

  componentWillMount() {
    this.subscription = chooseTemplateController(
      this.actions.observables,
      this.props.bpm,
      this.props.media.audioBuffers$
    ).subscribe(currentlyPlaying => this.setState({ currentlyPlaying }));
  }

  componentWillUnmount() {
    this.actions.callbacks.onUnmount();
    this.actions.completeAll();
  }

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
              isPlaying={this.state.currentlyPlaying === songId}
              onSelect={this.props.onSelect}
              onClickPlay={this.actions.callbacks.onPlay}
              onClickPause={this.actions.callbacks.onPause}
            />
          ))}
        </ul>
      </Overlay>
    );
  }
}

function chooseTemplateController(actions, bpm, audioBuffers$) {
  return actions.play$.switchMap(songId => {
    const context = startScriptedPlayback(
      Observable.of(songs[songId].notes),
      bpm,
      0,
      audioBuffers$,
      Observable.merge(actions.pause$, actions.play$, actions.unmount$).take(1)
    );

    return Observable.merge(
      Observable.of(songId),
      context.playCommands$.ignoreElements().concatWith(null)
    );
  });
}

ChooseSongOverlay.propTypes = {
  bpm: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.string.isRequired
};
