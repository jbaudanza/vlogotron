import React from 'react';

import Page from './Page';
import Instrument from './Instrument';
import SocialSection from './SocialSection';
import Link from './Link';
import LoginOverlay from './LoginOverlay';

import {findWrappingLink} from './domutils';


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
        this.props.onNavigate(clickable.pathname);
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

          <Instrument readonly />

          <h3>Record your own vlogotron</h3>
          <div className='button-wrapper'>
            <a href="/record" className='create-button'>Record</a>
          </div>

          <h3>
            Share this link on social media
          </h3>
          <SocialSection url={this.props.location.pathname} />
        </div>
      );
    }

    if (this.props.location.pathname === '/record') {
      content = (
        <div>
          <LoginOverlay
              onClose={this.props.onNavigate.bind(null, '/')}
              onLogin={this.props.onLogin} />;
          <Instrument />
        </div>
      );
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
  onNavigate: React.PropTypes.func.isRequired,
  onLogin:    React.PropTypes.func.isRequired
};
