import React from "react";

import classNames from "classnames";

import TopNavigation from "./TopNavigation";
import Link from "./Link";

import "./Page.scss";

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
            <TopNavigation
              onLogout={this.props.onLogout}
              isLoggedIn={this.props.isLoggedIn}
            />
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
