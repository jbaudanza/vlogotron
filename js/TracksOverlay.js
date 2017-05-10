import React from "react";
import { Observable } from "rxjs/Observable";

import { map, bindAll } from "lodash";

import PopupMenuTrigger from "./PopupMenuTrigger";
import SideNavOverlay from "./SideNavOverlay";

import Link from "./Link";

import "./TracksOverlay.scss";

class LineItem extends React.Component {
  render() {
    const updatedAt = new Date(this.props.song.updatedAt);
    const options = [
      [
        "#svg-pencil-2",
        "Edit Song",
        { href: "/songs/" + this.props.song.songId + "/record-videos" }
      ],
      ["#svg-share", "Share", {}],
      ["#svg-permission", "Permissions", {}],
      ["#svg-delete", "Delete", {}]
    ];

    return (
      <li>
        <PopupMenuTrigger options={options} className="more-button">
          <svg version="1.1" width={23} height={23}>
            <use xlinkHref="#svg-ellipsis" />
          </svg>
        </PopupMenuTrigger>
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
