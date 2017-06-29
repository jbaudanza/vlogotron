import PropTypes from "prop-types";
import React from "react";

import Link from "./Link";

import "./PopupMenu.scss";

import classNames from "classnames";

export default class PopupMenu extends React.Component {
  componentWillMount() {
    this.setState({ windowHeight: window.innerHeight });
  }

  render() {
    const pointerHeight = 10;
    const menuHeight = 20 + 27 * this.props.options.length;
    const menuWidth = 174;

    let orientation;
    if (this.state.windowHeight - this.props.targetRect.top > menuHeight) {
      orientation = "below";
    } else {
      orientation = "above";
    }

    const style = {
      position: "fixed",
      left: this.props.targetRect.left +
        this.props.targetRect.width / 2 -
        menuWidth / 2
    };
    if (orientation === "above") {
      style.top = this.props.targetRect.top - (menuHeight + pointerHeight);
    } else {
      style.top =
        this.props.targetRect.top +
        this.props.targetRect.height +
        pointerHeight;
    }

    const className = classNames("popup-menu", {
      "pointing-down": orientation === "above",
      "pointing-up": orientation === "below"
    });

    return (
      <div className={className} style={style}>
        <ul>
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
        </ul>
      </div>
    );
  }
}

PopupMenu.propTypes = {
  options: PropTypes.array.isRequired,
  targetRect: PropTypes.object.isRequired
};
