import PropTypes from "prop-types";
import React from "react";

import Overlay from "./Overlay";
import Link from "./Link";

import styled from "styled-components";
import { times } from "lodash";

const imageWidth = 40;
const imageCount = 8;

const ImageWrapper = styled.div`
  overflow: hidden;
  width: ${imageWidth * imageCount}px;
`;

const Image = styled.img`
  float: left;
  width: ${imageWidth}px;
`;

function draw(array, context, width, height) {
  const step = array.length / width;

  const amp = height / 2;

  context.fillStyle = "#a0a7c4";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#4b57a3";

  // i - index into canvas
  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;

    // j - index into data array
    for (let j = 0; j < Math.ceil(step); j++) {
      const sample = array[Math.floor(i * step) + j];

      if (sample < min) min = sample;

      if (sample > max) max = sample;
    }
    context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }
}

export default class TrimOverlay extends React.Component {
  constructor() {
    super();
    this.drawRef = this.drawRef.bind(this);
  }

  drawRef(canvasEl) {
    if (canvasEl) {
      const context = canvasEl.getContext("2d");
      const array = this.props.audioBuffer.getChannelData(0);
      draw(array, context, canvasEl.width, canvasEl.height);
    }
  }

  render() {
    return (
      <Overlay className="trim-overlay" onClose={this.props.onClose}>
        <h1>Trim</h1>
        <h2>
          Trim trim trim..
        </h2>
        <video playsInline width={200} poster={this.props.videoClip.poster}>
          {this.props.videoClip.sources.map(props => (
            <source {...props} key={props.type} />
          ))}
        </video>
        <ImageWrapper>
          {times(imageCount, i => (
            <Image src={this.props.videoClip.poster} key={i} />
          ))}
        </ImageWrapper>
        <canvas width={300} height={75} ref={this.drawRef} />
      </Overlay>
    );
  }
}

TrimOverlay.propTypes = {
  onClose: PropTypes.string.isRequired,
  videoClip: PropTypes.object.isRequired,
  audioBuffer: PropTypes.object.isRequired
};
