/* @flow */
import ActionLink from "./ActionLink";

import styled from "styled-components";

// XXX: Duplicated in Page.scss
const headerHeight = 63;

export default ActionLink.extend`
  margin: 0 7px;
  margin-top: ${headerHeight / 2 - 14}px;
  border: solid 1px white;
  white-space: nowrap;
  display: block;
  float: left;
`;
