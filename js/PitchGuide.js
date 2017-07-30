/* @flow */

import React from "react";
import styled from "styled-components";
import { times } from "lodash";

function SvgMeter(props: Object) {
  const width = props.width;
  const height = 10;
  const dotCount = 18;
  const middleY = height / 2;

  return (
    <svg version="1.1" width={width} height={height}>
      {times(18, i => (
        <circle
          key={i}
          cx={i * (width / dotCount)}
          cy={middleY}
          r="1"
          fill="#eee"
        />
      ))}
      <circle
        cx={width / 2}
        cy={middleY}
        r={height / 2 - 1}
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      {props.value == null
        ? null
        : <circle
            cx={width * props.value}
            cy={middleY}
            r="4"
            stroke="none"
            fill="#29bdec"
          />}
    </svg>
  );
}

const LabelWrapper = styled.div`
  overflow: hidden;
`;

const Label = styled.span`
  font-size: 50%;
  &:first-child {
    float: left;
  }
  &:last-child {
    float: right;
  }
`;

export default class PitchGuide extends React.Component {
  render() {
    const width = 136;
    const dotCount = 18;

    return (
      <div className="pitch-guide">
        <LabelWrapper>
          <Label>Low</Label>
          <Label>High</Label>
        </LabelWrapper>
        <div>
          <SvgMeter value={this.props.value} width={126} height={12} />
        </div>
      </div>
    );
  }
}
