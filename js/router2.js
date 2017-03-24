import {Observable} from 'rxjs/Observable';
import createHistory from 'history/createBrowserHistory';

// This is the UID that is loaded on the root URL. (It's me, Jon B!)
const DEFAULT_UID = 'b7Z6g5LFN7SiyJpAnxByRmuSHuV2';


function urlForUid(uid) {
  const baseUrl = document.location.protocol + '//' + document.location.host;

  if (uid === DEFAULT_UID) {
    return baseUrl + '/';
  } else {
    return baseUrl + '/u' + uid;
  }
}


export function navigate(href) {
  urlHistory.push(href);
}

function mapToRoute(location, user) {
  let match;

  if (location.pathname === '/') {
    return {mode: 'playback', uid: DEFAULT_UID, shareUrl: urlForUid(DEFAULT_UID)};
  } else if (location.pathname === '/record') {
    const obj = {mode: 'record'};
    if (user) {
      obj.uid = user.uid;
      obj.shareUrl = urlForUid(user.uid);
      obj.displayName = user.displayName;
    } else {
      obj.uid = null;
      obj.overlay = 'login';
    }
    return obj;
  } else if (match = location.pathname.match(/\/u\/([\w-]+)/)) {
    return {mode: 'playback', uid: match[1], shareUrl: urlForUid(match[1])};
  } else {
    return {mode: 'not-found'};
  }
}

const urlHistory = createHistory();

export const currentUser$ = Observable.create(function(observer) {
  firebase.auth().onAuthStateChanged((user) => observer.next(user));
});

const currentLocation$ = Observable.create((observer) => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});

export const currentRoute$ = Observable.combineLatest(
  currentLocation$, currentUser$, mapToRoute
).startWith({mode: 'loading'});
