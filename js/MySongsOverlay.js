import React from "react";
import { Observable } from "rxjs/Observable";

import { map, bindAll } from "lodash";

import PopupMenuTrigger from "./PopupMenuTrigger";
import SideNavOverlay from "./SideNavOverlay";

import Link from "./Link";

import "./MySongsOverlay.scss";

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
          <Link href={"/songs/" + this.props.song.songId}>
            {this.props.song.title}
          </Link>
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

export default class MySongsOverlay extends React.Component {
  render() {
    return (
      <SideNavOverlay onClose={this.props.onClose} className="my-songs-overlay">
        <h1>{this.context.messages["my-songs-header"]()}</h1>
        <ul className="song-list">
          {map(this.props.songs, (song, songId) => (
            <LineItem song={song} key={songId} songId={songId} />
          ))}
        </ul>
      </SideNavOverlay>
    );
  }
}

MySongsOverlay.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

MySongsOverlay.propTypes = {
  songs: React.PropTypes.object.isRequired
};