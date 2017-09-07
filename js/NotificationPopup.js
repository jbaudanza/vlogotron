/* @flow */

import * as React from "react";
import { bindAll } from "lodash";

import colors from "./colors";

import Link from "./Link";

import styled from "styled-components";

import RobotAvatar from "./RobotAvatar";

type Props = {
  className?: string,
  photoURL?: string,
  children: React.Node
};

type State = {
  open: boolean
};

const robotColors = {
  accent: colors.darkSkyBlue,
  outline: colors.purple,
  eyes: "#fff",
  face: "#8C9EE0",
  mouth: colors.purple
};

export default class NotificationPopup extends React.Component<Props, State> {
  constructor() {
    super();
    bindAll(this, "onOpen", "onClose");
    this.state = { open: true };
  }

  onClose() {
    this.setState({ open: false });
  }

  onOpen() {
    this.setState({ open: true });
  }

  render() {
    if (this.state.open) {
      let avatarEl;

      if (this.props.photoURL) {
        avatarEl = <img src={this.props.photoURL} />;
      } else {
        avatarEl = (
          <RobotAvatar width="51px" height="51px" colors={robotColors} />
        );
      }

      return (
        <OpenedNotification>
          <AvatarWrapper>
            {avatarEl}
          </AvatarWrapper>
          {this.props.children}
          <CloseLink onClick={this.onClose}>
            <svg version="1.1" width="13px" height="14px">
              <use xlinkHref="#svg-close" />
            </svg>
          </CloseLink>
        </OpenedNotification>
      );
    } else {
      return (
        <ClosedNotification>
          <Link onClick={this.onOpen}>?</Link>
        </ClosedNotification>
      );
    }
  }
}

const avatarSize = 50;

const AvatarWrapper = styled.div`
  border: 4px solid #fff;
  position: absolute;
  top: -29px;
  left: 50%;
  margin-left: ${-avatarSize / 2}px;
  width: ${avatarSize}px;
  height: ${avatarSize}px;
  border-radius: ${avatarSize}px;
  overflow: hidden;
  background-color: #CDD6F4;

  img {
    object-fit: cover;
    width: ${avatarSize}px;
    height: ${avatarSize}px;
  }
`;

const CloseLink = styled(Link)`
  position: absolute;
  right: 9px;
  top: 9px;
`;

const Wrapper = styled.div`
  position: fixed;
  bottom: 35px;
  right: 22px;
  box-shadow: 0 2px 4px 0 ${colors.lightBlueGreyTwo};
  background-color: #fff;
`;

const OpenedNotification = styled(Wrapper)`
  position: fixed;
  bottom: 35px;
  right: 22px;

  width: 207px;
  border-radius: 4px;

  padding: 30px 15px 15px 15px;
  box-sizing: border-box;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.2px;
  line-height: 1.5;
  text-align: center;
  color: ${colors.greyishBrown};

  a {
    color: ${colors.duskyBlue};
    text-decoration: none;
  }
`;

const ClosedNotification = styled(Wrapper)`
  width: 40px;
  height: 40px;
  line-height: 40px;
  font-size: 24px;
  font-weight: 600;
  background-color: #fff;
  border-radius: 40px;
  text-align: center;

  a {
    color: ${colors.blueGrey};
    display: block;
    text-decoration: none;
  }
  a:hover {
    color: {colors.purple};
  }
`;
