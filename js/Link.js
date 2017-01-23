import React from 'react';
import {omit} from 'lodash';
import classNames from 'classnames';


class Link extends React.Component {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick(event) {
    event.preventDefault();
    event.stopPropagation();
    this.props.onClick();
  }

  render() {
    const enabled = ('enabled' in this.props ? this.props.enabled : true);
    const className = classNames(this.props.className, {enabled, disabled: !enabled});

    const props = omit(this.props, 'onClick', 'children', 'enabled', 'className');

    if (enabled) {
      return (
        <a className={className} href="#" onClick={this.onClick} {...props}>
          {this.props.children}
        </a>
      );
    } else {
      return (
        <span className={className} {...props}>{this.props.children}</span>
      );
    }
  }
}

React.propTypes = {
  onClick: React.PropTypes.func.isRequired,
  enabled: React.PropTypes.bool
};

export default Link;
