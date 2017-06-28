import PropTypes from 'prop-types';
import React from "react";

import Overlay from "./Overlay";
import Link from "./Link";

import styled from 'styled-components';
import {times} from 'lodash';

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

export default class TrimOverlay extends React.Component {
  render() {
    return (
      <Overlay className="trim-overlay" onClose={this.props.onClose}>
        <h1>Trim</h1>
        <h2>
          Trim trim trim..
        </h2>
          <video
            playsInline
            width={200}
            poster={this.props.videoClip.poster}
          >
            {this.props.videoClip.sources.map(props => (
              <source {...props} key={props.type} />
            ))}
        </video>
        <ImageWrapper>
          {times(imageCount, (i) => <Image src={this.props.videoClip.poster} key={i} />)}
        </ImageWrapper>
      </Overlay>
    );
  }
}

TrimOverlay.propTypes = {
  onClose: PropTypes.string.isRequired,
  videoClip: PropTypes.object.isRequired
};
