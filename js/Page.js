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
                    href={location.hash === "#tracks" ? "#" : "#tracks"}
                    width="32px"
                    height="29px"
                    icon="#svg-sound-wave"
                    text={this.context.messages["navigation-my-tracks"]()}
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
          </div>
        </div>

        <div className="page-vertical-wrapper">
          {this.props.header}
          <div className="page-content">
            {this.props.children}
          </div>
          {this.props.footer}
        </div>
      </div>
    );
  }
}

Page.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

Page.PropTypes = {
  sidebarVisible: React.PropTypes.bool.isRequired,
  header: React.PropTypes.node.isRequired,
  footer: React.PropTypes.node
};
