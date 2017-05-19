import React from "react";

import SideOverlay from "./SideOverlay";
import TopNavigation from "./TopNavigation";

import Link from "./Link";

import "./NavOverlay.scss";

export default class NavOverlay extends React.Component {
  render() {
    return (
      <SideOverlay onClose={this.props.onClose} className="nav-overlay">
        <TopNavigation
          onLogout={this.props.onLogout}
          isLoggedIn={this.props.isLoggedIn}
        />
      </SideOverlay>
    );
  }
}
