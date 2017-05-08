import React from "react";

import { map } from "lodash";

import SideNavOverlay from "./SideNavOverlay";
import Link from "./Link";
import MoreButton from "./MoreButton";

import ReactActions from "./ReactActions";

import "./TracksOverlay.scss";

const lastUpdated = new Date();

class LineItem extends React.Component {
  render() {
    return (
      <li>
        <MoreButton size={21} />
        {this.props.song.title}
        <br />
        <span>
          {this.context.messages["last-updated-date"]({ DATE: lastUpdated })}
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
  render() {
    return (
      <SideNavOverlay className="tracks-overlay">
        <h1>{this.context.messages["my-tracks-header"]()}</h1>
        <ul className="song-list">
          {map(this.props.songs, (song, songId) => (
            <LineItem
              song={song}
              key={songId}
              songId={songId}
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

TracksOverlay.propTypes = {
  songs: React.PropTypes.object.isRequired
};
