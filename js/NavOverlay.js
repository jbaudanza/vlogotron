import React from "react";

// XXX: Rename SideNavOverlay
import SideNavOverlay from "./SideNavOverlay";
import TopNavigation from "./TopNavigation";

import Link from "./Link";

import "./NavOverlay.scss";

export default class NavOverlay extends React.Component {
  render() {
    return (
      <SideNavOverlay onClose={this.props.onClose} className="nav-overlay">
        <TopNavigation
          onLogout={this.props.onLogout}
          isLoggedIn={this.props.isLoggedIn}
        />
      </SideNavOverlay>
    );
  }
}
