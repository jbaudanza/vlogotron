import React from "react";
import Link from "./Link";

import "./SideOverlay.scss";

export default class SideOverlay extends React.Component {
  render() {
    const className = ((this.props.className || "") + " side-overlay").trim();

    return (
      <div id="sidenav" className={className}>
        <div className="shadow" />
        <div className="content">
          <Link href={this.props.onClose} className="close-link">
            <svg version="1.1" width="22px" height="21px">
              <use xlinkHref="#svg-close" fill="white" />
            </svg>
          </Link>
          {this.props.children}
        </div>
      </div>
    );
  }
}

SideOverlay.propTypes = {
  className: React.PropTypes.string
};
