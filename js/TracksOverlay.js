import React from "react";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { map, bindAll } from "lodash";

import SideNavOverlay from "./SideNavOverlay";
import Link from "./Link";

import "./TracksOverlay.scss";

const documentClick$ = Observable.fromEvent(document, "click");

class PopupMenu extends React.Component {
  constructor() {
    super();
    this.state = {};
    this.triggerAction = new Subject();

    this.trigger = this.triggerAction.next.bind(this.triggerAction);
  }

  componentWillMount() {
    const open$ = this.triggerAction.filter(x => x === true).switchMap(() => {
      const close$ = Observable.merge(
        this.triggerAction.filter(x => x === false),
        documentClick$
      )
        .take(1)
        .mapTo(false);

      return Observable.of(true).concat(close$);
    });

    this.subscription = open$.subscribe(v => this.setState({ open: v }));
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  render() {
    return (
      <div>
        <Link
          onClick={this.trigger.bind(this, !this.state.open)}
          className="more-button"
        >
          <svg version="1.1" width={23} height={23}>
            <use xlinkHref="#svg-ellipsis" />
          </svg>
        </Link>

        {this.state.open
          ? <div className="popup-menu">
              <ul>
                <li>
                  <Link>
                    <svg className="icon" width={15} height={16}>
                      <use xlinkHref="#svg-pencil-2" />
                    </svg>
                    Edit song
                  </Link>
                </li>
                <li>
                  <Link>
                    <svg className="icon" width={15} height={15}>
                      <use xlinkHref="#svg-share" />
                    </svg>
                    Share
                  </Link>
                </li>
                <li>
                  <Link>
                    <svg className="icon" width={15} height={15}>
                      <use xlinkHref="#svg-permission" />
                    </svg>
                    Permissions
                  </Link>
                </li>
                <li>
                  <Link>
                    <svg className="icon" width={15} height={15}>
                      <use xlinkHref="#svg-delete" />
                    </svg>
                    Delete
                  </Link>
                </li>
              </ul>
            </div>
          : null}
      </div>
    );
  }
}

class LineItem extends React.Component {
  render() {
    const updatedAt = new Date(this.props.song.updatedAt);
    return (
      <li>
        <PopupMenu />
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
