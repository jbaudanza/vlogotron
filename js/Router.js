import React from 'react';

import Page from './Page';
import Instrument from './Instrument';

// Find the wrapping anchor tag, if any
function findWrappingLink(element) {
  let clickable = element;

  while (clickable) {
    if (clickable instanceof HTMLAnchorElement)
      return clickable;
    else
      clickable = clickable.parentNode;
  }

  return null;
}


export default class Router extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick(event) {
    const node = event.target;

    if (node instanceof Node) {
      const clickable = findWrappingLink(node);

      if (clickable && clickable.host === document.location.host) {
        this.props.onNavigate(clickable.href);
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  render() {
    let content;

    if (this.props.location === '/') {
      content = <Instrument />;
    }

    if (this.props.location === '/edit') {
      // Edit the grid for the current user
    }

    if (this.props.location === '[uid]') {
      // Load the grid in read-only mode for the uid
    }

    return (
      <Page onClick={this.onClick}>
        {content}
        <Instrument />
      </Page>
    );
  }
}

Router.propTypes = {
  location:   React.PropTypes.object.isRequired,
  onNavigate: React.PropTypes.func.isRequired
};
