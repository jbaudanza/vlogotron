import PropTypes from 'prop-types';
import React from "react";
import { Observable } from "rxjs/Observable";

import { map, bindAll, isEmpty } from "lodash";

import PopupMenuTrigger from "./PopupMenuTrigger";

import Link from "./Link";

import "./MySongsOverlay.scss";

class LineItem extends React.Component {
  constructor() {
    super();
    this.onDelete = this.onDelete.bind(this);
  }

  onDelete() {
    const b = window.confirm(
      this.context.messages["delete-song-confirmation"]()
    );
    if (b) {
      this.props.onDelete(this.props.song);
    }
  }

  render() {
    const updatedAt = new Date(this.props.song.updatedAt);
    const options = [
      [
        "#svg-pencil-2",
        this.context.messages["edit-song-action"](),
        { href: "/songs/" + this.props.song.songId + "/record-videos" }
      ],
      [
        "#svg-delete",
        this.context.messages["delete-song-action"](),
        { onClick: this.onDelete }
      ]
    ];

    return (
      <li>
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
        <PopupMenuTrigger options={options} className="more-button">
          <svg version="1.1" width={23} height={23}>
            <use xlinkHref="#svg-ellipsis" />
          </svg>
        </PopupMenuTrigger>
      </li>
    );
  }
}

LineItem.contextTypes = {
  messages: PropTypes.object.isRequired
};

export default class MySongsOverlay extends React.Component {
  render() {
    return (
      <div className="my-songs-overlay">
        <div className="header">
          <h1>{this.context.messages["my-songs-header"]()}</h1>
        </div>
        <div className="scroll">
          {isEmpty(this.props.songs)
            ? <div>{this.context.messages["my-songs-empty-list"]()}</div>
            : <ul className="song-list">
                {map(this.props.songs, (song, songId) => (
                  <LineItem
                    song={song}
                    key={songId}
                    songId={songId}
                    onDelete={this.props.onDelete}
                  />
                ))}
              </ul>}
        </div>
      </div>
    );
  }
}

MySongsOverlay.contextTypes = {
  messages: PropTypes.object.isRequired
};

MySongsOverlay.propTypes = {
  songs: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired
};
