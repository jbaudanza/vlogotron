import React from "react";

import { Observable } from "rxjs/Observable";

import { map } from "lodash";

import SideNavOverlay from "./SideNavOverlay";
import Link from "./Link";
import PlayButton from "./PlayButton";

import { songs } from "./song";
import { startScriptedPlayback } from "./AudioPlaybackEngine";

import ReactActions from "./ReactActions";

import "./TracksOverlay.scss";

class LineItem extends React.Component {
  constructor(props) {
    super();
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
        <Link>
          {this.context.messages["select-action"]()}
        </Link>
      </li>
    );
  }
}

LineItem.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

export default class TracksOverlay extends React.Component {
  constructor() {
    super();

    this.actions = new ReactActions(["play", "pause", "unmount"]);

    this.state = {
      currentyPlaying: null
    };
  }

  componentWillMount() {
  }

  componentWillUnmount() {
    this.actions.callbacks.onUnmount();
    this.actions.completeAll();
  }

  render() {
    return (
      <SideNavOverlay className="tracks-overlay">
        <h1>My Tracks</h1>
        <ul className="song-list">
          {map(songs, (song, songId) => (
            <LineItem
              song={song}
              key={songId}
              songId={songId}
              isPlaying={this.state.currentlyPlaying === songId}
              onClickPlay={this.actions.callbacks.onPlay}
              onClickPause={this.actions.callbacks.onPause}
            />
          ))}
        </ul>
      </SideNavOverlay>
    );
  }
}

TracksOverlay.propTypes = {
};
