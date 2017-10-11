/* @flow */
import * as React from "react";

import classNames from "classnames";

import TopNavigation from "./TopNavigation";
import Link from "./Link";
import FinePrint from "./FinePrint";

// $FlowFixMe - scss not supported
import "./Page.scss";

type Props = {
  onLogout: Function,
  onCreateNew: Function,
  isLoggedIn: boolean,
  sidebarVisible: boolean,
  className?: string,
  onChangeLocale: string => void,
  children: React.Node
};

export default class Page extends React.Component<Props> {
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
              onCreateNew={this.props.onCreateNew}
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
