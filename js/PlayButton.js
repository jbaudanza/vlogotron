import PropTypes from "prop-types";
import React from "react";

import Link from "./Link";

export default class PlayButton extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick(event) {
    if (this.props.isPlaying) {
      this.props.onClickPause();
    } else {
      this.props.onClickPlay();
    }
  }

  render() {
    return (
      <Link
        onClick={this.onClick}
        className="play-button"
        enabled={this.props.enabled}
      >
        <svg version="1.1" width={this.props.size} height={this.props.size}>
          <use xlinkHref={this.props.isPlaying ? "#svg-pause" : "#svg-play"} />
        </svg>
      </Link>
    );
  }
}

PlayButton.propTypes = {
  enabled: PropTypes.bool.isRequired,
  size: PropTypes.number.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  onClickPlay: PropTypes.func.isRequired,
  onClickPause: PropTypes.func.isRequired
};
