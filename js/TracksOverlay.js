import React from "react";
import { Observable } from "rxjs/Observable";

import { map, bindAll } from "lodash";

import { findWrappingLink } from "./domutils";

import SideNavOverlay from "./SideNavOverlay";
import Link from "./Link";

import "./TracksOverlay.scss";

import PopupMenu from "./PopupMenu";

const documentClick$ = Observable.fromEvent(document, "click");
const escapeKeys$ = Observable.fromEvent(document, "keydown").filter(
  event => event.keyCode === 27
);

function pointBelow(rect) {
  return {
    left: rect.left + rect.width / 2,
    top: rect.top + rect.height
  };
}

class PopupMenuTrigger extends React.Component {
  constructor() {
    super();
    this.state = { open: false, showPosition: null };

    this.trigger = this.trigger.bind(this);
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  trigger(event) {
    if (this.state.showPosition) {
      close();
    } else {
      const el = findWrappingLink(event.target);

      if (el) {
        this.setState({
          showPosition: el.getBoundingClientRect()
        });
      }

      this.subscription = Observable.merge(documentClick$, escapeKeys$)
        .take(1)
        .subscribe(this.close.bind(this));
    }
  }

  close() {
    this.setState({ showPosition: null });

    if (this.subscription) {
      this.subscription.unsubscribe();
      delete this.subscription;
    }
  }

  render() {
    const options = [
      ["#svg-pencil-2", "Edit Song", { href: "/songs/" + this.props.songId }],
      ["#svg-share", "Share", {}],
      ["#svg-permission", "Permissions", {}],
      ["#svg-delete", "Delete", {}]
    ];

    let popup;
    if (this.state.showPosition) {
      popup = (
        <PopupMenu {...pointBelow(this.state.showPosition)} options={options} />
      );
    }

    return (
      <div>
        <Link onClick={this.trigger} className="more-button">
          <svg version="1.1" width={23} height={23}>
            <use xlinkHref="#svg-ellipsis" />
          </svg>
        </Link>
        {popup}
      </div>
    );
  }
}

class LineItem extends React.Component {
  render() {
    const updatedAt = new Date(this.props.song.updatedAt);
    return (
      <li>
        <PopupMenuTrigger songId={this.props.song.songId} />
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
