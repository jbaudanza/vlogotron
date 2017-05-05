import React from "react";

import Link from "./Link";

export default class MoreButton extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick(event) {}

  render() {
    return (
      <Link onClick={this.onClick} className="more-button">
        <svg version="1.1" width={this.props.size} height={this.props.size}>
          <use xlinkHref="#svg-ellipsis" />
        </svg>
      </Link>
    );
  }
}

MoreButton.propTypes = {
  size: React.PropTypes.number.isRequired
};
