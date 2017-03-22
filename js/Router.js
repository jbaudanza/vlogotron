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
      content = <Instrument readonly />;
    }

    if (this.props.route.mode === 'record') {
      content = <Instrument />;
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
