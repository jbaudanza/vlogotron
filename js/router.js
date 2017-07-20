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

import { fromPairs } from "lodash";

export function navigate(href) {
  urlHistory.push(href);
}

const id = "([\\w-]+)";

const routes = [
  [`/`, "root"],
  [`/record-videos`, "record-videos"],
  [`/note-editor`, "note-editor"],
  [`/songs/${id}`, "view-song", "songId"],
  [`/songs/${id}/record-videos`, "record-videos", "songId"],
  [`/songs/${id}/note-editor`, "note-editor", "songId"],
  [`/songs/${id}/(remix)/record-videos`, "record-videos", "songId", "remix"],
  [`/songs/${id}/(remix)/note-editor`, "note-editor", "songId", "remix"]
];

export function pathnameToRoute(pathname) {
  for (let i = 0; i < routes.length; i++) {
    const entry = routes[i];

    const match = pathname.match(new RegExp("^" + entry[0] + "$"));

    if (match) {
      const params = fromPairs(
        entry.slice(2).map((key, j) => [key, match[1 + j]])
      );

      return {
        name: entry[1],
        params: params
      };
    }
  }

  return { name: "not-found", params: {} };
}

export function routeToPageConfig(route) {
  switch (route.name) {
    case "root":
    case "view-song":
      return {
        view: PlaybackView,
        controller: playbackController,
        actions: ["play", "pause", "playCommands$"],
        sidebarVisible: true
      };
    case "record-videos":
      return {
        controller: recordVideosController,
        view: RecordVideosView,
        actions: [
          "startRecording",
          "stopRecording",
          "editSong",
          "dismissError",
          "clearVideoClip",
          "playCommands$",
          "pause",
          "play"
        ],
        sidebarVisible: true
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
          "playCommands$",
          "save"
        ],
        sidebarVisible: false
      };
    default:
      return {
        actions: [],
        controller: () => Observable.of({}),
        view: ErrorView,
        sidebarVisible: true
      };
  }
}

const urlHistory = createHistory();

export const currentLocation$ = Observable.create(observer => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});
