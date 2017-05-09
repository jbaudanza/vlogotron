import React from "react";

import Link from "./Link";

import "./PopupMenu.scss";

export default class PopupMenu extends React.Component {
  render() {
    const style = {
      position: "fixed",
      left: this.props.left - 174 / 2,
      top: this.props.top + 10 // Room for pointer
    };

    return (
      <div className="popup-menu" style={style}>
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
  options: React.PropTypes.array.isRequired,
  top: React.PropTypes.number.isRequired,
  left: React.PropTypes.number.isRequired
};
