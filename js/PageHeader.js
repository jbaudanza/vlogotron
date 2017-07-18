import React from "react";
import styled from "styled-components";
import colors from "./colors";

// XXX: Duplicated in Page.scss
const headerHeight = 63;

const PageHeader = styled.div.attrs({ className: "page-header" })`
  padding: 0 24px;

  flex: 0 0 ${headerHeight}px;

  background-color: ${colors.purple};
  display: flex;

  .song-title {
    font-weight: 500; // Medium
    font-size: 17px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .play-button {
    display: inline-block;
    width: 32px;
    height: 32px;
    margin-top: ${headerHeight / 2 - 16}px;
  }

  .song-info {
    flex-grow: 1;
    margin-left: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;

    font-weight: 500; // medium
    color: white;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    .by {
      opacity: 0.5;
    }
    .top {
      font-size: 17px;
    }
    .bottom {
      font-size: 10px;
    }
  }

  .action {
    margin: 0 7px;
    margin-top: ${headerHeight / 2 - 14}px;
    border: solid 1px white;
    white-space: nowrap;
    display: block;
    float: left;
  }
`;

export default PageHeader;
