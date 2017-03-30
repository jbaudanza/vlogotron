import React from 'react';

import {Observable} from 'rxjs/Observable';
import createHistory from 'history/createBrowserHistory';

import PlaybackView from './PlaybackView';
import RecordVideosView from './RecordVideosView';
import LoginOverlay from './LoginOverlay';


import playbackController from './playbackController';
import recordVideosController from './recordVideosController';


// This is the UID that is loaded on the root URL. (It's me, Jon B!)
const DEFAULT_UID = 'b7Z6g5LFN7SiyJpAnxByRmuSHuV2';

export function navigate(href) {
  urlHistory.push(href);
}

function mapToRoute(location, user) {
  let match;

  // TODO: Overlay should perhaps be a different observable, since it can
  // change independently of the main route.
  let overlay;
  if (location.hash === '#login') {
    overlay = (
      <LoginOverlay
          onLogin={() => false}
          onClose={location.pathname} />
    );
  }

  if (location.pathname === '/') {
    return {
      view: PlaybackView,
      controller: playbackController,
      overlay: overlay,
      location: location,
      params: {uid: DEFAULT_UID},
      initialState: {
        loading: true, videoClips: {}, playCommands$: Observable.never(), isPlaying: false, songLength: 0, playbackPositionInSeconds: 0, songName: ''
      }
    };
  } else if (location.pathname === '/record-videos') {
    return {
      controller: recordVideosController,
      view: RecordVideosView,
      initialState: {loading: true, videoClips: {}, playCommands$: Observable.never(), isPlaying: false, songLength: 0, playbackPositionInSeconds: 0, songName: ''}
    }
  } else if (match = location.pathname.match(/\/playback\/([\w-]+)/)) {
    return {
      params: {songId: match[1]}
    }
  } else {
    return {
      view: () => <div>Not found</div>
    };
  }
}

const urlHistory = createHistory();

export const currentUser$ = Observable.create(function(observer) {
  firebase.auth().onAuthStateChanged((user) => observer.next(user));
}).startWith(null);

const currentLocation$ = Observable.create((observer) => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});

export const currentRoute$ = Observable.combineLatest(
  currentLocation$, currentUser$, mapToRoute
);
