import React from "react";

import { Observable } from "rxjs/Observable";
import createHistory from "history/createBrowserHistory";

import PlaybackView from "./PlaybackView";
import RecordVideosView from "./RecordVideosView";
import NoteEditorView from "./NoteEditorView";
import ErrorView from "./ErrorView";

import playbackController from "./playbackController";
import noteEditorController from "./noteEditorController";
import recordVideosController from "./recordVideosController";

export function navigate(href) {
  urlHistory.push(href);
}

export function pathnameToRoute(pathname) {
  let match;

  if (pathname === "/") {
    return { name: "root", params: {} };
  } else if (pathname === "/record-videos") {
    return { name: "record-videos", params: {} };
  } else if (pathname === "/note-editor") {
    return { name: "note-editor", params: {} };
  } else if ((match = pathname.match(/\/songs\/([\w-]+)/))) {
    return { name: "view-song", params: { songId: match[1] } };
  } else {
    return { name: "not-found", params: {} };
  }
}

export function routeToPageConfig(route) {
  switch (route.name) {
    case "root":
      return {
        view: PlaybackView,
        controller: playbackController,
        actions: ["play", "pause", "playCommands$"]
      };
    case "record-videos":
      return {
        controller: recordVideosController,
        view: RecordVideosView,
        actions: [
          "startRecording",
          "stopRecording",
          "dismissError",
          "clearVideoClip",
          "playCommands$"
        ]
      };
    case "note-editor":
      return {
        view: NoteEditorView,
        controller: noteEditorController,
        actions: [
          "changeCellsPerBeat",
          "changePlaybackStartPosition",
          "editSong",
          "pause",
          "play",
          "playCommands$"
        ]
      };
    case "view-song":
      return {
        view: PlaybackView,
        controller: playbackController,
        location: location,
        actions: ["pause", "play", "playCommands$"]
      };
    default:
      return {
        actions: [],
        controller: () => Observable.of({}),
        view: ErrorView
      };
  }
}

const urlHistory = createHistory();

export const currentLocation$ = Observable.create(observer => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});
