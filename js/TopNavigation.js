import React from "react";

import Link from "./Link";

import { omit } from "lodash";

import "./TopNavigation.scss";

export default class TopNavigation extends React.Component {
  componentWillMount() {
    this.setState({recordingSupported: ("MediaRecorder" in window)})
  }

  render() {
    return (
      <div className="top-navigation">
        <NavLink
          href="/"
          width="33px"
          height="32px"
          icon="#svg-home"
          text={this.context.messages["navigation-home"]()}
        />
        {this.props.isLoggedIn
          ? <NavLink
              href={location.hash === "#my-songs" ? "#" : "#my-songs"}
              width="32px"
              height="29px"
              icon="#svg-sound-wave"
              text={this.context.messages["navigation-my-songs"]()}
            />
          : null}
        {this.state.recordingSupported
          ? <NavLink
              href="/record-videos"
              width="30px"
              height="30px"
              icon="#svg-plus"
              text={this.context.messages["navigation-create-new"]()}
            />
          : null}
        {this.props.isLoggedIn
          ? <NavLink
              onClick={this.props.onLogout}
              width="29px"
              height="27px"
              icon="#svg-logout"
              text={this.context.messages["navigation-logout"]()}
            />
          : <NavLink
              href="#login"
              width="33px"
              height="33px"
              icon="#svg-login"
              text={this.context.messages["navigation-login"]()}
            />}
      </div>
    );
  }
}

TopNavigation.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

TopNavigation.PropTypes = {
  onLogout: React.PropTypes.func.isRequired,
  isLoggedIn: React.PropTypes.bool.isRequired
};

function NavLink(props) {
  const linkProps = omit(props, "icon", "text");
  return (
    <Link {...linkProps} className="nav-link">
      <svg version="1.1" width={props.width} height={props.height}>
        <use xlinkHref={props.icon} />
      </svg>
      <span>{props.text}</span>
    </Link>
  );
}
