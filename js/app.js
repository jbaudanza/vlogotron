/* @flow */

import "./rxjs-additions";

import PropTypes from "prop-types";

import React from "react";
import ReactDOM from "react-dom";
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";

import { bindAll, isEqual, find, includes } from "lodash";
import { fontFamily } from "./fonts";

import SvgAssets from "./SvgAssets";
import styled from "styled-components";

import SideOverlay from "./SideOverlay";
import CreateNewSongOverlay from "./CreateNewSongOverlay";
import LoginOverlay from "./LoginOverlay";
import MySongsOverlay from "./MySongsOverlay";
import NavOverlay from "./NavOverlay";
import Page from "./Page";

import audioContext from "./audioContext";

import { findWrappingLink } from "./domutils";

import {
  updateUser,
  songsForUser,
  deleteSong,
  premiumAccountStatus
} from "./database";

import * as firebase from "firebase";

const config = {
  apiKey: "AIzaSyAcTTBS7Wt4JKn7_gsgXy3tck5arZamO6Y",
  authDomain: "www.vlogotron.com",
  databaseURL: "https://vlogotron-95daf.firebaseio.com",
  storageBucket: "vlogotron-95daf.appspot.com",
  messagingSenderId: "533081791637"
};
firebase.initializeApp(config);

import {
  subscribeToSongLocation,
  mapRouteToSongLocation
} from "./mediaLoading";

import {
  navigate,
  currentLocation$,
  pathnameToRoute,
  routeToViewComponent
} from "./router";

import messages from "./messages";

window.main = function(node) {
  ReactDOM.render(<App />, node);
};

const PageWrapper = styled.div`
  font-family: ${fontFamily};
`;

const currentUser$ = Observable.create(function(observer) {
  const auth = firebase.auth();
  observer.next(auth.currentUser);
  firebase.auth().onAuthStateChanged(user => observer.next(user));
});

currentUser$.subscribe(user => {
  if (user) {
    updateUser(firebase.database(), user);
  }
});

const premiumAccountStatus$ = currentUser$.switchMap(user => {
  if (user) {
    return premiumAccountStatus(firebase.database(), user.uid);
  } else {
    return Observable.of(false);
  }
});

// If the user logs in, navigate away from a login dialog
Observable.combineLatest(
  currentUser$.distinctUntilChanged(),
  currentLocation$,
  (user, location) => {
    if (user && location.hash === "#login") {
      return location.pathname;
    }
  }
)
  .nonNull()
  .subscribe(navigate);

const mySongs$ = currentUser$.switchMap(user => {
  if (user) {
    return songsForUser(firebase.database(), user.uid);
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
  if (
    typeof localStorage.locale === "string" &&
    includes(available, localStorage.locale)
  ) {
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
  state: {
    origin: string,
    locale: string,
    currentUser?: Object,
    location: Location,
    mySongs?: Object,
    premiumAccountStatus: boolean,
    component: Function
  };

  globalSubscription: Subscription;
  mediaSubscription: Subscription;
  media: Object;
  songLocation: Object;

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

    this.state = {
      locale: initializeLocale(),
      origin: document.location.origin,
      premiumAccountStatus: false,
      location: document.location,
      component: props => null
    };
  }

  onChangeLocale(locale: string) {
    this.setState({ locale });
    localStorage.setItem("locale", locale);
  }

  onClick(event) {
    const node = event.target;

    if (node instanceof Node) {
      const clickable = findWrappingLink(node);

      if (clickable && clickable.host === document.location.host) {
        // Assume that any url that ends with .html is static content that
        // requires a refresh. This is true for the privacy policy and tos
        const href = clickable.getAttribute("href");
        if (href && !href.endsWith(".html")) {
          this.onNavigate(href);
          event.preventDefault();
          event.stopPropagation();
        }
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
      mySongs$.subscribe(this.stateObserver("mySongs"))
    );

    this.globalSubscription.add(
      currentUser$.subscribe(this.stateObserver("currentUser"))
    );

    this.globalSubscription.add(
      currentLocation$.subscribe(this.stateObserver("location"))
    );

    this.globalSubscription.add(
      premiumAccountStatus$.subscribe(
        this.stateObserver("premiumAccountStatus")
      )
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
        firebase,
        this.mediaSubscription
      );
    }

    const component = routeToViewComponent(
      route,
      currentUser$,
      this.media,
      firebase
    );

    this.setState({
      component: component
    });
  }

  componentWillUnmount() {
    this.globalSubscription.unsubscribe();
    this.unsubscribeMedia();
  }

  onNavigate(href) {
    navigate(href);

    if (document.body) document.body.scrollTop = 0;
  }

  onLogin(providerString) {
    const provider = new firebase.auth[providerString + "AuthProvider"]();
    firebase.auth().signInWithPopup(provider);
  }

  onLogout() {
    firebase.auth().signOut();
  }

  onDelete(song) {
    deleteSong(firebase.database(), song);
  }

  getChildContext() {
    return {
      audioContext,
      messages: messages[this.state.locale],
      locale: this.state.locale
    };
  }

  render() {
    const isLoggedIn = !!this.state.currentUser;

    let overlay;
    let sideOverlayContent;
    let sideOverlayClassName;

    if (this.state.location.hash === "#login") {
      overlay = (
        <LoginOverlay
          onLogin={this.onLogin}
          onClose={this.state.location.pathname}
        />
      );
    } else if (this.state.location.hash === "#my-songs") {
      sideOverlayContent = (
        <MySongsOverlay songs={this.state.mySongs} onDelete={this.onDelete} />
      );
      sideOverlayClassName = "my-songs-overlay";
    } else if (this.state.location.hash === "#nav") {
      sideOverlayContent = (
        <NavOverlay isLoggedIn={isLoggedIn} onLogout={this.onLogout} />
      );
      sideOverlayClassName = "nav-overlay";
    } else if (this.state.location.hash === "#create-new") {
      overlay = (
        <CreateNewSongOverlay
          onLogin={this.onLogin}
          onClose={this.state.location.pathname}
          currentUser={this.state.currentUser}
          firebase={firebase}
          premiumAccountStatus={this.state.premiumAccountStatus}
          onNavigate={this.onNavigate}
        />
      );
    }

    const view = React.createElement(this.state.component, {
      location: this.state.location,
      shareUrl: this.state.origin + this.state.location.pathname,
      onNavigate: this.onNavigate,
      onLogin: this.onLogin
    });

    return (
      <PageWrapper onClick={this.onClick}>
        <SvgAssets />
        <Page
          sidebarVisible={true}
          onChangeLocale={this.onChangeLocale}
          onLogout={this.onLogout}
          isLoggedIn={isLoggedIn}
        >
          {view}
        </Page>
        {overlay}
        <SideOverlay
          className={sideOverlayClassName}
          visible={!!sideOverlayContent}
          onClose={this.state.location.pathname}
        >
          {sideOverlayContent}
        </SideOverlay>
      </PageWrapper>
    );
  }
}

App.childContextTypes = {
  audioContext: PropTypes.object,
  messages: PropTypes.object,
  locale: PropTypes.string
};
