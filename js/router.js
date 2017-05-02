import React from "react";

import { Observable } from "rxjs/Observable";
import createHistory from "history/createBrowserHistory";

import PlaybackView from "./PlaybackView";
import RecordVideosView from "./RecordVideosView";
import NoteEditorView from "./NoteEditorView";

import playbackController from "./playbackController";
import noteEditorController from "./noteEditorController";
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
  } else if (pathname === "/note-editor") {
    return {
      view: NoteEditorView,
      controller: noteEditorController,
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
  } else if ((match = pathname.match(/\/songs\/([\w-]+)/))) {
    return {
      params: { songId: match[1] },
      view: PlaybackView,
      controller: playbackController,
      location: location,
      actions: ["pause", "play", "playCommands$"]
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
