import PropTypes from "prop-types";
import React from "react";

import Overlay from "./Overlay";
import Link from "./Link";
import TrimAdjuster from "./TrimAdjuster";
import styled from "styled-components";

import { times } from "lodash";

const contentWidth = 420;

class TrimOverlay extends React.Component {
  constructor() {
    super();
    this.state = {
      trimStart: 0.0,
      trimEnd: 1.0
    };
  }

  render() {
    return (
      <Overlay
        className="trim-overlay"
        className={this.props.className}
        onClose={this.props.onClose}
      >
        <h1>Trim video</h1>
        <video
          playsInline
          width={contentWidth}
          poster={this.props.videoClip.poster}
        >
          {this.props.videoClip.sources.map(props => (
            <source {...props} key={props.type} />
          ))}
        </video>
        <TrimAdjuster
          audioBuffer={this.props.audioBuffer}
          width={contentWidth}
          height={50}
          trimStart={this.state.trimStart}
          trimEnd={this.state.trimEnd}
          onChangeStart={trimStart => this.setState({ trimStart })}
          onChangeEnd={trimEnd => this.setState({ trimEnd })}
        />
      </Overlay>
    );
  }
}

TrimOverlay.propTypes = {
  onClose: PropTypes.string.isRequired,
  videoClip: PropTypes.object.isRequired,
  audioBuffer: PropTypes.object.isRequired
};

export default styled(TrimOverlay)`
  .content {
    width: ${contentWidth}px;
    text-align: left;
  }
`;
