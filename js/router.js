import React from "react";

import { Observable } from "rxjs/Observable";
import createHistory from "history/createBrowserHistory";

import PlaybackView from "./PlaybackView";
import RecordVideosView from "./RecordVideosView";
import SongEditorView from "./SongEditorView";

import playbackController from "./playbackController";
import songEditorController from "./songEditorController";
import recordVideosController from "./recordVideosController";

export function navigate(href) {
  urlHistory.push(href);
}

function mapToRoute(pathname) {
  let match;

  if (pathname === "/") {
    return {
      view: PlaybackView,
      controller: playbackController,
      location: location,
      params: {},
      actions: ["play", "pause", "playCommands$"]
    };
  } else if (pathname === "/record-videos") {
    return {
      controller: recordVideosController,
      location: location,
      params: {},
      view: RecordVideosView,
      actions: [
        "changeTitle",
        "startRecording",
        "stopRecording",
        "dismissError",
        "clearVideoClip",
        "playCommands$"
      ]
    };
  } else if (pathname === "/song-editor") {
    return {
      view: SongEditorView,
      controller: songEditorController,
      location: location,
      actions: [
        "changeCellsPerBeat",
        "changePlaybackStartPosition",
        "changeTitle",
        "editSong",
        "pause",
        "play",
        "playCommands$"
      ]
    };
  } else if ((match = pathname.match(/\/playback\/([\w-]+)/))) {
    return {
      params: { songId: match[1] },
      location: location
    };
  } else {
    return {
      actions: [],
      params: {},
      view: () => <div>Not found</div>,
      location: location
    };
  }
}

const urlHistory = createHistory();

export const currentLocation$ = Observable.create(observer => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});

export const currentRoute$ = currentLocation$
  .map(location => location.pathname)
  .distinctUntilChanged()
  .map(mapToRoute);
