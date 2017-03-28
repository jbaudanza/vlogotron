import './rxjs-additions';

import React from 'react';
import ReactDOM from 'react-dom';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';

import {bindAll} from 'lodash';

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
    bindAll(this, 'onLogin', 'onNavigate', 'onLogout', 'bindView');

    this.state = {};
  }

  componentWillMount() {
    this.subscription = currentRoute$.subscribe((route) => {
      this.setState({
        route: route,
        viewState: route.initialState
      });
    });
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();

    if (this.pageSubscription) {
      this.pageSubscription.unsubscribe();
    }
  }

  bindView(view) {
    if (this.pageSubscription) {
      this.pageSubscription.unsubscribe();
    }

    this.pageSubscription = new Subscription();

    const viewState$ = this.state.route.controller(
      this.state.route.params, view.actions, this.pageSubscription
    );

    this.pageSubscription.add(
      viewState$.subscribe((viewState) => this.setState({viewState}))
    );
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
    const View = this.state.route.view;

    return (
      <div>
        <SvgAssets />
        <View
            {...this.state.viewState}
            ref={this.bindView}
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
