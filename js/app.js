/* @flow */

import "./rxjs-additions";

import PropTypes from "prop-types";

import * as React from "react";
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
  premiumAccountStatus,
  createSongBoard
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

import { subscribeToSongBoardId } from "./mediaLoading";
import type { Media } from "./mediaLoading";
import type { FirebaseUser } from "./database";

import {
  navigate,
  currentLocation$,
  pathnameToRoute,
  routeToViewComponent
} from "./router";
import type { Route } from "./router";

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

function songBoardIdForRoute(route: Route): ?string {
  if (route.name === "root") {
    return "-KrRkEMrrpH0P4YcDgme";
  } else if ("songBoardId" in route.params) {
    return route.params.songBoardId;
  } else {
    return null;
  }
}

type State = {
  origin: string,
  locale: string,
  currentUser?: FirebaseUser,
  location: Location,
  mySongs?: Object,
  premiumAccountStatus: boolean,
  component: Function
};

class App extends React.Component<{}, State> {
  globalSubscription: Subscription;
  mediaSubscription: Subscription;
  media: Media;
  songBoardId: ?string;

  constructor() {
    super();
    bindAll(
      this,
      "onLogin",
      "onChangeLocale",
      "onNavigate",
      "onLogout",
      "onClick",
      "onRouteChange",
      "onCreateSongBoard"
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
      delete this.songBoardId;
    }
  }

  onRouteChange(route) {
    const newSongBoardId = songBoardIdForRoute(route);

    if (newSongBoardId == null) {
      this.unsubscribeMedia();
    } else if (this.songBoardId != newSongBoardId) {
      this.mediaSubscription = new Subscription();
      this.songBoardId = newSongBoardId;
      this.media = subscribeToSongBoardId(
        newSongBoardId,
        messages[this.state.locale]["default-song-title"](),
        firebase,
        this.mediaSubscription
      );
    }

    const component = routeToViewComponent(route, this.media, firebase);

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

  onCreateSongBoard(songId: string) {
    const user = this.state.currentUser;
    if (
      !user // This is to make flow happy. It shouldn't happen
    )
      return;

    const promise = createSongBoard(firebase.database(), user.uid, songId);

    promise.then(
      key => {
        this.onNavigate("/song-boards/" + key);
      },
      err => {
        console.error(err);
      }
    );
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
      // TODO:
      // - consider new names for: CreateNewSongOverlay, and ChooseSongOverlay
      if (this.state.currentUser) {
        overlay = (
          <CreateNewSongOverlay
            onClose={this.state.location.pathname}
            currentUser={this.state.currentUser}
            premiumAccountStatus={this.state.premiumAccountStatus}
            onSelectSong={this.onCreateSongBoard}
          />
        );
      } else {
        overlay = (
          <LoginOverlay
            onLogin={this.onLogin}
            onClose={this.state.location.pathname}
          />
        );
      }
    }

    const view = React.createElement(this.state.component, {
      location: this.state.location,
      origin: this.state.origin,
      onNavigate: this.onNavigate,
      onLogin: this.onLogin,
      currentUser: this.state.currentUser,
      premiumAccountStatus: this.state.premiumAccountStatus
    });

    return (
      <PageWrapper onClick={this.onClick}>
        <SvgAssets />
        <Page
          sidebarVisible={isSidebarVisible(
            pathnameToRoute(this.state.location.pathname)
          )}
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

function isSidebarVisible(route) {
  return route.name !== "collab-song-board";
}

App.childContextTypes = {
  audioContext: PropTypes.object,
  messages: PropTypes.object,
  locale: PropTypes.string
};
