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
    let overlay;

    if (this.props.route.mode === 'playback') {
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
          <SocialSection url={this.props.route.shareUrl} />
        </div>
      );
    }

    if (this.props.route.mode === 'record') {
      content = (
        <div>
          <h3>
            Hello {this.props.route.displayName}, you can record videos by clicking
            on the squares below. If you are someone else, you can <Link onClick={this.props.onLogout}>sign out</Link>.
          </h3>

          <Instrument />
        </div>
      );
    }

    if (this.props.route.overlay === 'login') {
      overlay = <LoginOverlay
                  onClose={this.props.onNavigate.bind(null, '/')}
                  onLogin={this.props.onLogin} />;
    }

    return (
      <Page onClick={this.onClick}>
        {overlay}
        {content}
      </Page>
    );
  }
}

Router.propTypes = {
  route:      React.PropTypes.object.isRequired,
  onNavigate: React.PropTypes.func.isRequired,
  onLogin:    React.PropTypes.func.isRequired,
  onLogout:   React.PropTypes.func.isRequired
};
