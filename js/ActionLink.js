/* @flow */

import Link from "./Link";

import colors from "./colors";
import styled from "styled-components";
import { fontFamily } from "./fonts";

export default styled(Link)`
  background-color: ${colors.duskyBlue};
  font-size: 11px;
  font-weight: 600; // semi-bold
  padding: 0 15px;
  text-decoration: none;
  font-family: ${fontFamily};

  display: inline-block;
  height: 28px;
  line-height: 28px;
  opacity: 0.7;
  border-radius: 49px;
  color: white;
  text-transform: uppercase;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: 0.2px;

  &:hover.enabled {
    opacity: 1;
  }

  &.disabled {
    background-color: #ababab;
  }
`;
