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

import { mediaForRoute } from "./mediaLoading";

import "./style.scss";
import {
  navigate,
  currentLocation$,
  pathnameToRoute,
  routeToPageConfig
} from "./router";

const messages = require("messageformat-loader!json-loader!./messages.json");

window.main = function(node) {
  ReactDOM.render(<App />, node);
};

const currentUser$ = Observable.create(function(observer) {
  const auth = firebase.auth();
  observer.next(auth.currentUser);
  firebase.auth().onAuthStateChanged(user => observer.next(user));
});

currentUser$.subscribe(user => {
  if (user) {
    const ref = firebase.database().ref("users").child(user.uid);
    ref.child("displayName").set(user.displayName);
    ref.child("lastSeenAt").set(firebase.database.ServerValue.TIMESTAMP);
  }
});

const currentPathname$ = currentLocation$
  .map(location => location.pathname)
  .distinctUntilChanged();

const currentRoute$ = currentPathname$.map(pathnameToRoute);

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
    this.globalSubscription = new Subscription();

    this.media = mediaForRoute(
      currentPathname$,
      currentUser$,
      this.globalSubscription
    );

    this.globalSubscription.add(currentRoute$.subscribe(this.onRouteChange));

    this.globalSubscription.add(
      currentLocation$.subscribe(this.stateObserver("location"))
    );
  }

  onRouteChange(route) {
    const pageConfig = routeToPageConfig(route);

    this.disposePage();

    this.pageSubscription = new Subscription();

    this.pageActions = new ReactActions(pageConfig.actions);

    const viewState$ = pageConfig.controller(
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
        const View = pageConfig.view;
        this.setState({
          view: (
            <View
              {...viewState}
              media={this.media}
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

    const view = React.cloneElement(this.state.view, {
      location: this.state.location
    });

    return (
      <div onClick={this.onClick}>
        <SvgAssets />
        {view}
        {overlay}
      </div>
    );
  }
}

App.childContextTypes = {
  audioContext: React.PropTypes.object,
  messages: React.PropTypes.object
};
