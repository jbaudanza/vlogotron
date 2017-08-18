/* @flow */

import * as React from "react";
import styled from "styled-components";

import Spinner from "./Spinner";
import colors from "./colors";

const StyledContent = styled.div`
  color: ${colors.dark};
  text-align: center;

  svg {
    display: block;
    margin: 25px auto;
    fill: ${colors.dark};
  }
`;

export default function LoadingView() {
  return (
    <div className="page-vertical-wrapper">
      <StyledContent className="page-content">

        <Spinner size={100} />
        loading...
      </StyledContent>
    </div>
  );
}
