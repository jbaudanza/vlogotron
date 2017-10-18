/* @flow */
import React from "react";

import Link from "./Link";

// $FlowFixMe
import "./PopupMenu.scss";

import styled from "styled-components";
import colors from "./colors";

import classNames from "classnames";
import type { Rect } from "./domutils";

type Props = {
  options: Array<[string, string, Object]>,
  targetRect: Rect
};

type State = {
  windowHeight: number
};

const menuBackgroundColor = "#fff";
const menuWidth = 174;
const menuPadding = 10;
const menuOptionHeight = 27;

const Wrapper = styled.div`
  position: absolute;
  font-size: 13px;
  padding: ${menuPadding}px 0;
  background-color: ${menuBackgroundColor};
  letter-spacing: 0.2px;
  width: ${menuWidth}px;
  box-shadow: 0 2px 7px 0 ${colors.paleGrey};
  border-radius: 2px;
  z-index: 2;
`;

const MenuUL = styled.ul`
  padding: 0;
  margin: 0;
  list-style-type: none;

  .icon {
    margin-right: 15px;
    margin-top: 5px;
    float: left;
  }

  li {
    padding: 0;
    margin: 0;
    height: ${menuOptionHeight}px;
  }

  li > a {
    display: block;
    text-decoration: none;
    color: ${colors.greyishBrown};
    padding: 0 15px;
    height: ${menuOptionHeight}px;
    line-height: ${menuOptionHeight}px;

    &:hover {
      background-color: ${colors.paleGrey};
    }
  }
`;

export default class PopupMenu extends React.Component<Props, State> {
  componentWillMount() {
    this.setState({ windowHeight: window.innerHeight });
  }

  render() {
    const pointerHeight = 10;
    const menuHeight =
      menuPadding * 2 + menuOptionHeight * this.props.options.length;

    const targetRectBottom =
      this.props.targetRect.top + this.props.targetRect.height;

    let orientation;
    if (
      this.state.windowHeight - targetRectBottom > menuHeight + pointerHeight
    ) {
      orientation = "below";
    } else {
      orientation = "above";
    }

    const style: Object = {
      position: "fixed",
      left: this.props.targetRect.left +
        this.props.targetRect.width / 2 -
        menuWidth / 2
    };
    if (orientation === "above") {
      console.log(menuHeight, pointerHeight);
      style.top = this.props.targetRect.top - (menuHeight + pointerHeight);
    } else {
      style.top = targetRectBottom + pointerHeight;
    }

    const className = classNames("popup-menu", {
      "pointing-down": orientation === "above",
      "pointing-up": orientation === "below"
    });

    return (
      <Wrapper className={className} style={style}>
        <MenuUL>
          {this.props.options.map((option, i) => (
            <li key={i}>
              <Link {...option[2]}>
                <svg className="icon" width={15} height={16}>
                  <use xlinkHref={option[0]} />
                </svg>
                {option[1]}
              </Link>
            </li>
          ))}
        </MenuUL>
      </Wrapper>
    );
  }
}
