import React from "react";
import Link from "./Link";

import "./SideNavOverlay.scss";

class SideNavOverlay extends React.Component {
  render() {
    const className = ((this.props.className || "") + " sidenav").trim();

    return (
      <div id="sidenav" className={className}>
        <div className="shadow" />
        <div className="content">
          <Link href={this.props.onClose} className="close-link">
            <svg version="1.1" width="22px" height="21px">
              <use xlinkHref="#svg-close" fill="white" />
            </svg>
          </Link>
          <div className="scroll">
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}

SideNavOverlay.propTypes = {
  className: React.PropTypes.string
};

export default SideNavOverlay;
