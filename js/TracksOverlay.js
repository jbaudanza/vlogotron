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
    const updatedAt = new Date(this.props.song.updatedAt);
    return (
      <li>
        <MoreButton size={23} />
        <div className="title">
          {this.props.song.title}
        </div>
        <div className="updated-at">
          {this.context.messages["last-updated-date"]({ DATE: updatedAt })}
        </div>
        <div className="permissions">
          {this.props.song.visibility === "everyone"
            ? this.context.messages["permissions-play-and-remix"]()
            : this.context.messages["permissions-private"]()}
        </div>
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
      <SideNavOverlay onClose={this.props.onClose} className="tracks-overlay">
        <h1>{this.context.messages["my-tracks-header"]()}</h1>
        <ul className="song-list">
          {map(this.props.songs, (song, songId) => (
            <LineItem song={song} key={songId} songId={songId} />
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
