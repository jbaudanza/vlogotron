import './rxjs-additions';

import React from 'react';
import ReactDOM from 'react-dom';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import {Subject} from 'rxjs/Subject';

import {bindAll, fromPairs, forEach} from 'lodash';

import SvgAssets from './SvgAssets';

import audioContext from './audioContext';

import {findWrappingLink} from './domutils';

import './style.scss';
import {navigate, currentRoute$} from './router';

import bindComponentToObservable from './bindComponentToObservable';

const messages = require('messageformat-loader!json-loader!./messages.json');

window.main = function(node) {
  ReactDOM.render(<App />, node);
};

export const currentUser$ = Observable.create(function(observer) {
  const auth = firebase.auth();
  observer.next(auth.currentUser);
  firebase.auth().onAuthStateChanged((user) => observer.next(user));
});


class App extends React.Component {
  constructor() {
    super();
    bindAll(this, 'onLogin', 'onNavigate', 'onLogout', 'onClick', 'onRouteChange');

    this.state = {overlay: null};
  }

  onClick(event) {
    const node = event.target;

    if (node instanceof Node) {
      const clickable = findWrappingLink(node);

      if (clickable && clickable.host === document.location.host) {
        this.onNavigate(clickable.getAttribute('href'));
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  componentWillMount() {
    this.subscription = currentRoute$.subscribe(this.onRouteChange);
  }

  onRouteChange(route) {
    this.disposePage();

    this.pageSubscription = new Subscription();

    this.pageActions = fromPairs(route.actions.map(
      (name) => ([name + '$', new Subject()]))
    );

    const viewState$ = route.controller(
      route.params, this.pageActions, currentUser$, this.pageSubscription
    );

    this.setState({
      overlay: route.overlay,
      location: route.location,
      view: (<div/>) // If the controller emits immediately, this div will never be shown.
    });

    this.pageSubscription.add(
      viewState$.subscribe((viewState) => {
        const View = route.view;
        this.setState({
          view: (
             <View
                {...viewState}
                actions={this.pageActions}
                onNavigate={this.onNavigate}
                onLogin={this.onLogin}
                onLogout={this.onLogout} />
          )
        });
      })
    );
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();

    this.disposePage();
  }

  disposePage() {
    if (this.pageSubscription) {
      this.pageSubscription.unsubscribe();
      forEach(this.pageActions, (subject) => subject.complete());

      delete this.pageSubscription;
      delete this.pageActions;
    }
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
    return {audioContext, messages};
  }

  render() {
    let overlay;
    if (this.state.overlay) {
      const Overlay = this.state.overlay;
      overlay = (
        <Overlay
          onLogin={this.onLogin}
          onClose={this.state.location.pathname} />
      );
    }

    return (
      <div onClick={this.onClick}>
        <SvgAssets />
        {this.state.view}
        {overlay}
      </div>
    );
  }
}

App.childContextTypes = {
  audioContext: React.PropTypes.object,
  messages:     React.PropTypes.object
};
