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
import LoginOverlay from "./LoginOverlay";
import MySongsOverlay from "./MySongsOverlay";
import NavOverlay from "./NavOverlay";
import Page from "./Page";

import audioContext from "./audioContext";

import { findWrappingLink } from "./domutils";

import {
  updateUser,
  songBoardsForUser,
  deleteSongBoard,
  premiumAccountStatus,
  createSongBoard
} from "./database";
import type { SongBoard, DenormalizedSongBoard } from "./database";

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
import type { SongId, Song } from "./song";

import {
  navigate,
  currentLocation$,
  pathnameToRoute,
  routeToViewComponent,
  recordVideosPath
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

const mySongBoards$ = currentUser$.switchMap(user => {
  if (user) {
    return songBoardsForUser(firebase.database(), user.uid);
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
    return "-KjtoXV7i2sZ8b_Azl1y"; // The Entertainer
  } else if (typeof route.params.songBoardId === "string") {
    return route.params.songBoardId;
  } else {
    return null;
  }
}

type State = {
  origin: string,
  locale: string,
  currentUser?: Firebase$User,
  location: Location,
  mySongBoards?: { [string]: DenormalizedSongBoard },
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
      "onDelete",
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
      mySongBoards$.subscribe(this.stateObserver("mySongBoards"))
    );

    this.globalSubscription.add(
      currentUser$.subscribe(this.updateUser.bind(this))
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

  updateUser(user: Firebase$User) {
    this.setState({ currentUser: user });

    if (user) {
      if (this.state.location.hash === "#login-and-create-new") {
        this.onCreateSongBoard();
      }
    }
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
        this.mediaSubscription
      );
    }

    const component = routeToViewComponent(route, this.media);

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

  onLogin(providerString: string) {
    const provider = new firebase.auth[providerString + "AuthProvider"]();
    return firebase.auth().signInWithPopup(provider);
  }

  onLogout() {
    firebase.auth().signOut();
  }

  onDelete(songBoardId: string) {
    if (this.state.currentUser) {
      const uid = this.state.currentUser.uid;
      deleteSongBoard(firebase.database(), uid, songBoardId);
    }
  }

  onCreateSongBoard(parentSongBoard?: SongBoard) {
    const user = this.state.currentUser;
    if (user) {
      const promise = createSongBoard(
        firebase.database(),
        user.uid,
        parentSongBoard
      );

      promise.then(
        key => {
          this.onNavigate(recordVideosPath(key));
        },
        err => {
          console.error(err);
        }
      );
    } else {
      this.onNavigate("#login-and-create-new");
    }
  }

  getChildContext() {
    return {
      audioContext,
      messages: messages[this.state.locale],
      locale: this.state.locale,
      firebase: firebase
    };
  }

  render() {
    const isLoggedIn = !!this.state.currentUser;

    let overlay;
    let sideOverlayContent;
    let sideOverlayClassName;

    if (
      this.state.location.hash === "#login" ||
      this.state.location.hash === "#login-and-create-new"
    ) {
      overlay = (
        <LoginOverlay
          onLogin={this.onLogin}
          onClose={this.state.location.pathname}
        />
      );
    } else if (
      this.state.location.hash === "#my-songs" && this.state.mySongBoards
    ) {
      sideOverlayContent = (
        <MySongsOverlay
          songBoards={this.state.mySongBoards}
          onDelete={this.onDelete}
        />
      );
      sideOverlayClassName = "my-songs-overlay";
    } else if (this.state.location.hash === "#nav") {
      sideOverlayContent = (
        <NavOverlay isLoggedIn={isLoggedIn} onLogout={this.onLogout} />
      );
      sideOverlayClassName = "nav-overlay";
    } else if (this.state.location.hash === "#create-new") {
      if (this.state.currentUser) {
        // TODO: Fix this
        // overlay = (
        //   <CreateNewSongOverlay
        //     onClose={this.state.location.pathname}
        //     currentUser={this.state.currentUser}
        //     premiumAccountStatus={this.state.premiumAccountStatus}
        //     onSelectSong={this.onCreateSongBoard}
        //   />
        // );
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
      onCreateSongBoard: this.onCreateSongBoard,
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
          onCreateNew={() => this.onCreateSongBoard()}
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
  return !(route.name === "note-editor" || route.name === "record-videos");
}

App.childContextTypes = {
  audioContext: PropTypes.object,
  messages: PropTypes.object,
  firebase: PropTypes.object,
  locale: PropTypes.string
};
