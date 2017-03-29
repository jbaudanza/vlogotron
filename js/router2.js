import {Observable} from 'rxjs/Observable';
import createHistory from 'history/createBrowserHistory';

import PlaybackView from './PlaybackView';

import playbackController from './playbackController';

// This is the UID that is loaded on the root URL. (It's me, Jon B!)
const DEFAULT_UID = 'b7Z6g5LFN7SiyJpAnxByRmuSHuV2';


export function navigate(href) {
  urlHistory.push(href);
}

function mapToRoute(location, user) {
  // let match;

  // if (location.pathname === '/') {
  //   return {
  //     view: PlaybackView, uid: DEFAULT_UID
  //   };
  // } else if (location.pathname === '/record') {
  //   const obj = {view: PlaybackView};
  //   if (user) {
  //     obj.uid = user.uid;
  //     obj.displayName = user.displayName;
  //   } else {
  //     obj.uid = null;
  //     obj.overlay = 'login';
  //   }
  //   return obj;
  // } else if (match = location.pathname.match(/\/u\/([\w-]+)/)) {
  //   return {uid: match[1], view: PlaybackView};
  // } else {
  //   return {view: PlaybackView};
  // }

  return {
    view: PlaybackView,
    controller: playbackController,
    params: {uid: DEFAULT_UID},
    initialState: {
      loading: true, videoClips: {}, playCommands$: Observable.never(), isPlaying: false, songLength: 0, playbackPositionInSeconds: 0, songName: ''
    }
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
