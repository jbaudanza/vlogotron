/* @flow */

import PropTypes from "prop-types";
import * as React from "react";
import styled from "styled-components";

import colors from "./colors";

const Wrapper = styled.div`
  color: ${colors.dark};
  text-align: center;
`;

const ErrorCode = styled.div`
  width: 260px;
  margin: 0 auto;
  margin-top: 25px;
  overflow: hidden;

  span {
    font-size: 125px;
  }
  span, svg {
    float: left;
  }
  svg {
    fill: ${colors.dark};
  }
`;

const ErrorMessage = styled.div`
  font-size: 24px;
`;

class ErrorView extends React.Component<{}> {
  render() {
    return (
      <Wrapper className="page-vertical-wrapper">
        <div className="page-content">
          <ErrorCode>
            <span style={{ fontSize: "125px" }}>4</span>
            <svg version="1.1" width={100} height={125} viewBox="0 0 100 125">
              <path d="M80.3,23.7h-3.9c0-0.3,0.1-0.6,0.1-0.9c0-1-0.2-1.9-0.6-2.8L88.1,7.8c0.6-0.6,0.6-1.7,0-2.3c-0.6-0.6-1.7-0.6-2.3,0l-12,12  c-1.1-0.8-2.5-1.3-4-1.3c-1.2,0-2.4,0.4-3.4,0.9l-4.9-4.9c-0.1-0.1-0.1-0.1-0.2-0.1c-0.3-0.4-0.8-0.7-1.3-0.7h-8.1L49.6,9  C49,8.3,48,8.3,47.3,9c-0.6,0.6-0.6,1.7,0,2.3l2.9,2.9c0.3,0.3,0.8,0.5,1.3,0.5c0,0,0.1,0,0.1,0h7.8l4.7,4.7c-0.6,1-1,2.2-1,3.5  c0,0.3,0.1,0.6,0.1,0.9H19.7c-4.6,0-8.3,3.4-8.3,7.7v55.9c0,4.2,3.7,7.7,8.3,7.7h60.6c4.6,0,8.3-3.4,8.3-7.7V31.4  C88.6,27.2,84.9,23.7,80.3,23.7z M78,26.5c2.9,0,5.4,1.5,6.7,3.7l-2.9,2.3l-10.6,0.2l-13.1,4.8l-3.9-2.5l1.7,2.7l-0.6-0.2l-14.6-3.9  L38.6,30l-5.2-1.4L32,26.5H78z M22,81.3c-4.2,0-7.7-3.2-7.7-7.1v-1.3v-0.4v-0.6V33.5c0-3.9,3.4-7.1,7.7-7.1h9.7l1.2,2.4l5.1,1.8  l1.8,3.7L53,39.9l-9.1,10.5l-14,3.6l-3.2,5.3l-6.8,3.1l-5.5,10.2l5.8-9.4l7.8-3.7l2.2-4.5l14.6-2.8L56,40.5l-1.4,7.7l3.4-7.7  l4.7,8.4L62.3,58l-7.7,3.1l-6.1,20.2H22z M75.9,89.7c-0.9,0-1.6-0.7-1.6-1.6c0-0.9,0.7-1.6,1.6-1.6c0.9,0,1.6,0.7,1.6,1.6  C77.5,89,76.8,89.7,75.9,89.7z M85.6,71.9v1.2v1.1c0,3.9-3.4,7.1-7.7,7.1H48.6l6.9-19.4l8.3-3.1v-9.7l10.9,6.5l1.2,11.1l4.8,1.2  l4,6.9L81,67.1L76.4,65l-1.1-10.1L63.9,47l-3.3-6.8l5,2.5l-4.1-4.2l10.1-4.6l10.1-0.6l3-3c0.6,1,0.9,2.1,0.9,3.3V71.9z" />
            </svg>
            <span style={{ fontSize: "125px" }}>4</span>
          </ErrorCode>
          <ErrorMessage>
            {this.context.messages["not-found-error"]()}
          </ErrorMessage>
        </div>
      </Wrapper>
    );
  }
}

ErrorView.contextTypes = {
  messages: PropTypes.object.isRequired
};

export default ErrorView;
