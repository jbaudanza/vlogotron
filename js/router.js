import React from "react";

import { Observable } from "rxjs/Observable";
import createHistory from "history/createBrowserHistory";

import PlaybackView from "./PlaybackView";
import RecordVideosView from "./RecordVideosView";
import SongEditorView from "./SongEditorView";
import LoginOverlay from "./LoginOverlay";

import playbackController from "./playbackController";
import songEditorController from "./songEditorController";
import recordVideosController from "./recordVideosController";

// This is the UID that is loaded on the root URL. (It's me, Jon B!)
const DEFAULT_UID = "b7Z6g5LFN7SiyJpAnxByRmuSHuV2";

export function navigate(href) {
  urlHistory.push(href);
}

function mapToRoute(location) {
  let match;

  // TODO: Overlay should perhaps be a different observable, since it can
  // change independently of the main route.
  let overlay;
  if (location.hash === "#login") {
    overlay = LoginOverlay;
  }

  if (location.pathname === "/") {
    return {
      view: PlaybackView,
      controller: playbackController,
      overlay: overlay,
      location: location,
      params: { uid: DEFAULT_UID },
      actions: ["play", "pause", "playCommands$"]
    };
  } else if (location.pathname === "/record-videos") {
    return {
      controller: recordVideosController,
      location: location,
      params: { uid: DEFAULT_UID },
      view: RecordVideosView,
      actions: [
        "startRecording",
        "stopRecording",
        "dismissError",
        "clearVideoClip",
        "playCommands$"
      ]
    };
  } else if (location.pathname === "/song-editor") {
    return {
      view: SongEditorView,
      controller: songEditorController,
      location: location,
      actions: ["play", "pause", "playCommands$", "changePlaybackStartPosition"]
    };
  } else if ((match = location.pathname.match(/\/playback\/([\w-]+)/))) {
    return {
      params: { songId: match[1] },
      location: location
    };
  } else {
    return {
      actions: [],
      view: () => <div>Not found</div>,
      location: location
    };
  }
}

const urlHistory = createHistory();

const currentLocation$ = Observable.create(observer => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});

export const currentRoute$ = currentLocation$.map(mapToRoute);
