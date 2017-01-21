import React from 'react';

import Page from './Page';
import Instrument from './Instrument';
import SocialSection from './SocialSection';
import Link from './Link';


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

    if (this.props.location.pathname === '/') {
      content = (
        <div>
          <h3>
            Click on the videos, click the piano, or mash on your keyboard.
          </h3>

          <Instrument />

          <h3>Record your own vlogotron</h3>
          <div className='button-wrapper'>
            <Link className='create-button'>Record</Link>
          </div>

          <h3>
            Share this link on social media
          </h3>
          <SocialSection url={this.props.location.pathname} />
        </div>
      );
    }

    if (this.props.location.pathname === '/edit') {
      // Edit the grid for the current user
    }

    if (this.props.location.pathname === '[uid]') {
      // Load the grid in read-only mode for the uid
    }

    return (
      <Page onClick={this.onClick}>
        {content}
      </Page>
    );
  }
}

Router.propTypes = {
  location:   React.PropTypes.object.isRequired,
  onNavigate: React.PropTypes.func.isRequired
};
