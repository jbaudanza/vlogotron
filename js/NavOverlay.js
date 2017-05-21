import React from "react";

import TopNavigation from "./TopNavigation";
import FinePrint from "./FinePrint";

import Link from "./Link";

import "./NavOverlay.scss";

export default class NavOverlay extends React.Component {
  render() {
    return (
      <div className="nav-overlay">
        <TopNavigation
          onLogout={this.props.onLogout}
          isLoggedIn={this.props.isLoggedIn}
        />
        <FinePrint />
      </div>
    );
  }
}
