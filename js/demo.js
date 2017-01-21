import React from 'react';
import ReactDOM from 'react-dom';

import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';


import QwertyHancock from './qwerty-hancock';
import createHistory from 'history/createBrowserHistory';
import {bindAll, omit} from 'lodash';

import Router from './Router';
import SvgAssets from './SvgAssets';

import './style.scss'

import bindComponentToObservable from './bindComponentToObservable';

window.main = function(node) {
  ReactDOM.render(<App />, node);
};


class App extends React.Component {
  constructor() {
    super();
    bindAll(this, 'onLogin', 'onNavigate', 'onCloseOverlay');
    this.state = {showLoginOverlay: false};
  }

  componentWillMount() {
    this.urlHistory = createHistory();
    const url$ = Observable.create((observer) => {
      observer.next(this.urlHistory.location);
      return this.urlHistory.listen(observer.next.bind(observer));
    });

    this.Router = bindComponentToObservable(Router, {location: url$});
  }

  onNavigate(href) {
    this.urlHistory.push(href);
  }

  onLogin(providerString) {
    const provider = new firebase.auth[providerString + 'AuthProvider']();
    firebase.auth().signInWithPopup(provider);
  }

  onCloseOverlay() {
    this.setState({showLoginOverlay: false})
  }

  render() {
    let overlay;
    if (this.state.showLoginOverlay) {
      overlay = <LoginOverlay onClose={this.onCloseOverlay} onLogin={this.onLogin} />;
    }

    return (
      <div>
        <SvgAssets />
        {overlay}
        <this.Router onNavigate={this.onNavigate} onLogin={this.onLogin} />
      </div>
    );
  }
}
