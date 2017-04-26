import "./rxjs-additions";

import React from "react";
import ReactDOM from "react-dom";
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";
import { Subject } from "rxjs/Subject";

import { bindAll, fromPairs } from "lodash";

import SvgAssets from "./SvgAssets";
import LoginOverlay from "./LoginOverlay";

import ReactActions from "./ReactActions";

import audioContext from "./audioContext";

import { findWrappingLink } from "./domutils";

import {
  loadAudioBuffersFromVideoClips,
  videoClipsForRoute,
  songForRoute
} from "./mediaLoading";

import "./style.scss";
import { navigate, currentRoute$, currentLocation$ } from "./router";

import bindComponentToObservable from "./bindComponentToObservable";

const messages = require("messageformat-loader!json-loader!./messages.json");

window.main = function(node) {
  ReactDOM.render(<App />, node);
};

const currentUser$ = Observable.create(function(observer) {
  const auth = firebase.auth();
  observer.next(auth.currentUser);
  firebase.auth().onAuthStateChanged(user => observer.next(user));
});

class App extends React.Component {
  constructor() {
    super();
    bindAll(
      this,
      "onLogin",
      "onNavigate",
      "onLogout",
      "onClick",
      "onRouteChange"
    );
  }

  onClick(event) {
    const node = event.target;

    if (node instanceof Node) {
      const clickable = findWrappingLink(node);

      if (clickable && clickable.host === document.location.host) {
        this.onNavigate(clickable.getAttribute("href"));
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  stateObserver(name) {
    return value => this.setState({ [name]: value });
  }

  componentWillMount() {
    const currentPathname$ = currentLocation$.map(o => o.pathname);

    this.globalSubscription = new Subscription();

    const song$ = mediaForRoute(
      currentPathname$,
      currentUser$
    ).publishReplay();
    this.globalSubscription.add(song$.connect());

    const audioLoading = loadAudioBuffersFromVideoClips(
      videoClips$,
      this.globalSubscription
    );

    this.media = {
      videoClips$: videoClips$,
      audioBuffers$: audioLoading.audioBuffers$,
      loading$: audioLoading.loading$
    };

    this.globalSubscription.add(currentRoute$.subscribe(this.onRouteChange));

    this.globalSubscription.add(
      currentLocation$.subscribe(this.stateObserver("location"))
    );
  }

  onRouteChange(route) {
    this.disposePage();

    this.pageSubscription = new Subscription();

    this.pageActions = new ReactActions(route.actions);

    const viewState$ = route.controller(
      route.params,
      this.pageActions.observables,
      currentUser$,
      this.media,
      this.pageSubscription
    );

    this.setState({
      view: <div>loading</div> // If the controller emits immediately, this div will never be shown.
    });

    this.pageSubscription.add(
      viewState$.subscribe(viewState => {
        const View = route.view;
        this.setState({
          view: (
            <View
              {...viewState}
              media={this.media}
              location={route.location}
              actions={this.pageActions}
              onNavigate={this.onNavigate}
              onLogin={this.onLogin}
              onLogout={this.onLogout}
            />
          )
        });
      })
    );
  }

  componentWillUnmount() {
    this.globalSubscription.unsubscribe();

    this.disposePage();
  }

  disposePage() {
    if (this.pageSubscription) {
      this.pageSubscription.unsubscribe();
      this.pageActions.completeAll();

      delete this.pageSubscription;
      delete this.pageActions;
    }
  }

  onNavigate(href) {
    navigate(href);
    document.body.scrollTop = 0;
  }

  onLogin(providerString) {
    const provider = new firebase.auth[providerString + "AuthProvider"]();
    firebase.auth().signInWithPopup(provider);
  }

  onLogout() {
    firebase.auth().signOut();
  }

  getChildContext() {
    return { audioContext, messages };
  }

  render() {
    let overlay;
    if (this.state.location.hash === "#login") {
      const Overlay = this.state.overlay;
      overlay = (
        <LoginOverlay
          onLogin={this.onLogin}
          onClose={this.state.location.pathname}
        />
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
  messages: React.PropTypes.object
};
