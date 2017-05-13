import "./rxjs-additions";

import React from "react";
import ReactDOM from "react-dom";
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";
import { Subject } from "rxjs/Subject";

import { bindAll, fromPairs, isEqual, find, includes } from "lodash";

import SvgAssets from "./SvgAssets";
import LoginOverlay from "./LoginOverlay";

import MySongsOverlay from "./MySongsOverlay";

import ReactActions from "./ReactActions";

import audioContext from "./audioContext";

import { findWrappingLink } from "./domutils";

import { updateUser, songsForUser } from "./database";

import {
  subscribeToSongLocation,
  mapRouteToSongLocation
} from "./mediaLoading";

import "./style.scss";
import {
  navigate,
  currentLocation$,
  pathnameToRoute,
  routeToPageConfig
} from "./router";

import messages from "./messages";

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
    updateUser(user);
  }
});

const mySongs$ = currentUser$.switchMap(user => {
  if (user) {
    return songsForUser(user.uid);
  } else {
    return Observable.of({});
  }
});

const currentPathname$ = currentLocation$
  .map(location => location.pathname)
  .distinctUntilChanged();

const currentRoute$ = currentPathname$.map(pathnameToRoute);

function initializeLocale() {
  const available = ["en", "ko"];

  // First, see if the user picked a locale in previous session
  if ("locale" in localStorage && includes(available, localStorage.locale)) {
    return localStorage.locale;
  }

  // This is supported in newer browsers
  if ("languages" in navigator) {
    const result = find(navigator.languages, v => includes(available, v));
    if (result) return result;
  }

  // Default to english
  return "en";
}

class App extends React.Component {
  constructor() {
    super();
    bindAll(
      this,
      "onLogin",
      "onChangeLocale",
      "onNavigate",
      "onLogout",
      "onClick",
      "onRouteChange"
    );

    this.state = { locale: initializeLocale() };
  }

  onChangeLocale(locale) {
    this.setState({ locale });
    localStorage.locale = locale;
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

    this.globalSubscription.add(currentRoute$.subscribe(this.onRouteChange));

    this.globalSubscription.add(
      mySongs$.subscribe(v => this.setState({ mySongs: v }))
    );

    this.globalSubscription.add(
      currentLocation$.subscribe(this.stateObserver("location"))
    );
  }

  unsubscribeMedia() {
    if (this.mediaSubscription) {
      this.mediaSubscription.unsubscribe();
      delete this.mediaSubscription;
      delete this.media;
      delete this.songLocation;
    }
  }

  onRouteChange(route) {
    this.disposePage();

    const songLocation = mapRouteToSongLocation(route);
    if (
      this.songLocation == null || !isEqual(this.songLocation, songLocation)
    ) {
      this.unsubscribeMedia();
      this.mediaSubscription = new Subscription();
      this.songLocation = songLocation;
      this.media = subscribeToSongLocation(
        songLocation,
        messages[this.state.locale]["default-song-title"](),
        this.mediaSubscription
      );
    }

    this.pageSubscription = new Subscription();

    const pageConfig = routeToPageConfig(route);

    this.pageActions = new ReactActions(pageConfig.actions);

    const viewState$ = pageConfig.controller(
      route.params,
      this.pageActions.observables,
      currentUser$,
      this.media,
      this.pageSubscription,
      this.onNavigate.bind(this)
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
              onChangeLocale={this.onChangeLocale}
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
    this.unsubscribeMedia();
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
    return { audioContext, messages: messages[this.state.locale] };
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
    } else if (this.state.location.hash === "#my-songs") {
      const Overlay = this.state.overlay;
      overlay = <MySongsOverlay songs={this.state.mySongs} onClose="#" />;
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
