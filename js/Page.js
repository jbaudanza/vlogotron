import React from "react";

import classNames from "classnames";
import { omit } from "lodash";

import Link from "./Link";

import "./Page.scss";

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

export default class Page extends React.Component {
  render() {
    return (
      <div className={classNames("page", this.props.className)}>
        <div
          className={classNames("page-sidebar", {
            hidden: !this.props.sidebarVisible
          })}
        >
          <div className="page-sidebar-content">
            <div className="logo">VLOGOTRON</div>
            <div className="navigation">
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
              <NavLink
                href="/record-videos"
                width="30px"
                height="30px"
                icon="#svg-plus"
                text={this.context.messages["navigation-create-new"]()}
              />
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
            <span>English</span>
          </div>

          <div className="locale-selector">
            <Link onClick={this.props.onChangeLocale.bind(null, "en")}>
              En
            </Link>
            <span> / </span>
            <Link onClick={this.props.onChangeLocale.bind(null, "ko")}>
              한국어
            </Link>
          </div>
        </div>

        {this.props.children}
      </div>
    );
  }
}

Page.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

Page.PropTypes = {
  sidebarVisible: React.PropTypes.bool.isRequired,
  onChangeLocale: React.PropTypes.func.isRequired,
  onLogout: React.PropTypes.func.isRequired,
  isLoggedIn: React.PropTypes.bool.isRequired
};
