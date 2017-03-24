import './rxjs-additions';

import React from 'react';
import ReactDOM from 'react-dom';

import {bindAll} from 'lodash';

import Router from './Router';
import SvgAssets from './SvgAssets';

import audioContext from './audioContext';

import './style.scss';
import {navigate, currentRoute$} from './router2';

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

  getChildContext() {
    return {audioContext};
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

App.childContextTypes = {
  audioContext: React.PropTypes.object
};
