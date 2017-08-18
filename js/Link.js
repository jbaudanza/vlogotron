/* @flow */
import PropTypes from "prop-types";
import * as React from "react";
import { omit } from "lodash";
import classNames from "classnames";

type Props = {
  href?: string,
  className?: string,
  enabled?: boolean,
  onClick?: Function,
  children: React.Node
};

class Link extends React.Component<Props> {
  onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.props.onClick) this.props.onClick(event);
  }

  render() {
    const enabled = "enabled" in this.props ? this.props.enabled : true;
    const className = classNames(this.props.className, {
      enabled,
      disabled: !enabled
    });

    const props = omit(
      this.props,
      "onClick",
      "children",
      "enabled",
      "className"
    );

    if (this.props.onClick) {
      props.onClick = this.onClick.bind(this);
      props.href = "#";
    }

    if (enabled) {
      return (
        <a className={className} {...props}>
          {this.props.children}
        </a>
      );
    } else {
      return (
        <span className={className} {...omit(props, "onClick", "href")}>
          {this.props.children}
        </span>
      );
    }
  }
}

export default Link;
