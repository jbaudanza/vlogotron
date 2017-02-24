import './rxjs-additions';

import React from 'react';
import ReactDOM from 'react-dom';

import {bindAll} from 'lodash';

import Router from './Router';
import SvgAssets from './SvgAssets';

import {navigate, currentRoute$} from './VideoClipStore';

import './style.scss';

import bindComponentToObservable from './bindComponentToObservable';

window.main = function(node) {
  ReactDOM.render(<App />, node);
};


class App extends React.Component {
  constructor() {
    super();
    bindAll(this, 'onLogin', 'onNavigate', 'onLogout');
  }

  componentWillMount() {
    this.Router = bindComponentToObservable(Router, {route: currentRoute$});
  }

  onNavigate(href) {
    navigate(href);
    document.body.scrollTop = 0;
  }

  onLogin(providerString) {
    const provider = new firebase.auth[providerString + 'AuthProvider']();
    firebase.auth().signInWithPopup(provider);
  }

  onLogout() {
    firebase.auth().signOut();
  }

  render() {
    return (
      <div>
        <SvgAssets />
        <this.Router
            onNavigate={this.onNavigate}
            onLogin={this.onLogin}
            onLogout={this.onLogout} />
      </div>
    );
  }
}
