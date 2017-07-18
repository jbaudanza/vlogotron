import React from "react";
import styled from "styled-components";
import colors from "./colors";

const TextBlob = styled.div`
  width: 80%;
  margin: 25px auto;
  padding: 15px;
  background-color: #fff;
  border-radius: 1em;

  h3 {
    margin-top: 0;
  }
  color: ${colors.dark};
  border: 1px solid ${colors.dark};
`;

export default function RecordingNotSupported(props) {
  return (
    <TextBlob className={props.className}>
      <h3>Sorry, we can't record videos in your browser.</h3>

      <p>
        We wish we could, but the Vologtron uses
        {" "}
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder">
          technology
        </a>
        {" "}
        to
        record video and audio that isn't available in your web browser.
      </p>

      <p>
        If you have
        {" "}
        <a href="https://www.google.com/chrome">Chrome</a>
        {" "}
        or
        {" "}
        <a href="https://www.mozilla.org/firefox">FireFox</a>
        {" "}
        installed, give
        that a try.
      </p>
    </TextBlob>
  );
}
