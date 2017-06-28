import PropTypes from 'prop-types';
import React from "react";

import classNames from "classnames";

import TopNavigation from "./TopNavigation";
import Link from "./Link";
import FinePrint from "./FinePrint";

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

          {/*
          <div className="locale-selector">
            <Link onClick={this.props.onChangeLocale.bind(null, "en")}>
              En
            </Link>
            <span> / </span>
            <Link onClick={this.props.onChangeLocale.bind(null, "ko")}>
              한국어
            </Link>
          </div>
          */}

          <FinePrint />
        </div>

        {this.props.children}
      </div>
    );
  }
}

Page.contextTypes = {
  messages: PropTypes.object.isRequired
};

Page.PropTypes = {
  sidebarVisible: PropTypes.bool.isRequired,
  onChangeLocale: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  isLoggedIn: PropTypes.bool.isRequired
};
