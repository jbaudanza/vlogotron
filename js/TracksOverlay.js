import React from "react";

import { Observable } from "rxjs/Observable";

import { map } from "lodash";

import SideNavOverlay from "./SideNavOverlay";
import Link from "./Link";
import MoreButton from "./MoreButton";

import { songs } from "./song";
import { startScriptedPlayback } from "./AudioPlaybackEngine";

import ReactActions from "./ReactActions";

import "./TracksOverlay.scss";

const lastUpdated = new Date();

class LineItem extends React.Component {
  constructor(props) {
    super();
  }

  render() {
    return (
      <li>
        <MoreButton size={21} />
        {this.props.song.title}
        <br />
        <span>
          {this.context.messages["last-updated-date"]({DATE: lastUpdated})}
          <br />
          PRIVATE
        </span>
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

  componentWillUnmount() {
    this.actions.callbacks.onUnmount();
    this.actions.completeAll();
  }

  render() {
    return (
      <SideNavOverlay className="tracks-overlay">
        <h1>{this.context.messages["my-tracks-header"]()}</h1>
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

TracksOverlay.contextTypes = {
  messages: React.PropTypes.object.isRequired
};


TracksOverlay.propTypes = {};
