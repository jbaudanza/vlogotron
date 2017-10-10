/* @flow */

import PropTypes from "prop-types";
import * as React from "react";
import { Observable } from "rxjs/Observable";

import { map, bindAll, isEmpty } from "lodash";

import PopupMenuTrigger from "./PopupMenuTrigger";
import { recordVideosPath, songBoardPath } from "./router";

import type { DenormalizedSongBoard } from "./database";

import Link from "./Link";

// $FlowFixMe - sccs not supported
import "./MySongsOverlay.scss";

type LineItemProps = {
  songBoardId: string,
  songBoard: DenormalizedSongBoard,
  onDelete: string => void
};

class LineItem extends React.Component<LineItemProps> {
  constructor() {
    super();
    this.onDelete = this.onDelete.bind(this);
  }

  onDelete: Function;

  onDelete() {
    const b = window.confirm(
      this.context.messages["delete-song-confirmation"]()
    );
    if (b) {
      this.props.onDelete(this.props.songBoardId);
    }
  }

  render() {
    const updatedAt = new Date(this.props.songBoard.updatedAt);
    const options = [
      [
        "#svg-pencil-2",
        this.context.messages["edit-song-action"](),
        { href: recordVideosPath(this.props.songBoardId) }
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
          <Link href={songBoardPath(this.props.songBoardId)}>
            {this.props.songBoard.title}
          </Link>
        </div>
        <div className="updated-at">
          {this.context.messages["last-updated-date"]({ DATE: updatedAt })}
        </div>
        <div className="permissions">
          {this.props.songBoard.visibility === "everyone"
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

type Props = {
  songBoards: { [string]: DenormalizedSongBoard },
  onDelete: string => void
};

export default class MySongsOverlay extends React.Component<Props> {
  render() {
    return (
      <div className="my-songs-overlay">
        <div className="header">
          <h1>{this.context.messages["my-songs-header"]()}</h1>
        </div>
        <div className="scroll">
          {isEmpty(this.props.songBoards)
            ? <div>{this.context.messages["my-songs-empty-list"]()}</div>
            : <ul className="song-list">
                {map(this.props.songBoards, (songBoard, songBoardId) => (
                  <LineItem
                    songBoard={songBoard}
                    key={songBoardId}
                    songBoardId={songBoardId}
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
