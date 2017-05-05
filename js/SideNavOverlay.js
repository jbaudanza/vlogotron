import React from "react";

import "./SideNavOverlay.scss";

class SideNavOverlay extends React.Component {
  render() {
    const className = ((this.props.className || "") + " sidenav").trim();

    return (
      <div id="sidenav" className={className}>
        <div className="content">
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
