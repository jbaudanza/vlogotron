import React from "react";

import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";

import { map, forEach } from "lodash";

import Overlay from "./Overlay";
import Link from "./Link";
import PlayButton from "./PlayButton";

import { songs } from "./song";
import { startScriptedPlayback } from "./AudioPlaybackEngine";

import "./ChooseSongOverlay.scss";

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
  messages: React.PropTypes.object.isRequired
};

export default class ChooseSongOverlay extends React.Component {
  constructor() {
    super();
    this.actions = {
      play$: new Subject(),
      pause$: new Subject(),
      unmount$: new Subject()
    };

    this.onClickPause = this.onClickPause.bind(this);
    this.onClickPlay = this.onClickPlay.bind(this);

    this.state = {
      currentyPlaying: null
    };
  }

  componentWillMount() {
    this.subscription = chooseTemplateController(
      this.actions.play$,
      this.actions.pause$,
      this.actions.unmount$,
      this.props.bpm,
      this.props.media.audioBuffers$
    ).subscribe(currentlyPlaying => this.setState({ currentlyPlaying }));
  }

  componentWillUnmount() {
    this.actions.unmount$.next({});
    forEach(this.actions, subject => subject.complete());
  }

  onClickPlay(songId) {
    this.actions.play$.next(songId);
  }

  onClickPause(songId) {
    this.actions.pause$.next(songId);
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
              onClickPlay={this.onClickPlay}
              onClickPause={this.onClickPause}
            />
          ))}
        </ul>
      </Overlay>
    );
  }
}

function chooseTemplateController(play$, pause$, unmount$, bpm, audioBuffers$) {
  return play$.switchMap(songId => {
    const context = startScriptedPlayback(
      Observable.of(songs[songId].notes),
      bpm,
      0,
      audioBuffers$,
      Observable.merge(pause$, play$, unmount$).take(1)
    );

    return Observable.merge(
      Observable.of(songId),
      context.playCommands$.ignoreElements().concatWith(null)
    );
  });
}

ChooseSongOverlay.propTypes = {
  bpm: React.PropTypes.number.isRequired,
  onSelect: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.string.isRequired
};
