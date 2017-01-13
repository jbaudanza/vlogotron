import React from 'react';
import {omit} from 'lodash';

class Link extends React.Component {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick(event) {
    event.preventDefault();
    this.props.onClick();
  }

  render() {
    return (
      <a href="#" onClick={this.onClick} {...omit(this.props, 'onClick')}>
        {this.props.children}
      </a>
    );
  }
}

React.propTypes = {
  onClick: React.PropTypes.func.isRequired
}

export default Link;
