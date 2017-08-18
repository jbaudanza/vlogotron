/* @flow */

import PropTypes from "prop-types";
import * as React from "react";

import { bindAll } from "lodash";
import Link from "./Link";

type Props = {
  onClickPlay: Function,
  onClickPause: Function,
  isPlaying: boolean,
  className?: string,
  enabled: boolean,
  size: number
};

export default class PlayButton extends React.Component<Props> {
  static defaultProps: {
    enabled: boolean
  };

  constructor() {
    super();
    bindAll(this, "onClick");
  }

  onClick(event: Event) {
    if (this.props.isPlaying) {
      this.props.onClickPause();
    } else {
      this.props.onClickPlay();
    }
  }

  render() {
    let className = "play-button";
    if (this.props.className) {
      className += " " + this.props.className;
    }

    return (
      <Link
        onClick={this.onClick}
        className={className}
        enabled={this.props.enabled}
      >
        <svg version="1.1" width={this.props.size} height={this.props.size}>
          <use xlinkHref={this.props.isPlaying ? "#svg-pause" : "#svg-play"} />
        </svg>
      </Link>
    );
  }
}

PlayButton.defaultProps = {
  enabled: true
};
