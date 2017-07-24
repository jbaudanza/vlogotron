import React from "react";

import { Observable } from "rxjs/Observable";
import createHistory from "history/createBrowserHistory";

import PlaybackView from "./PlaybackView";
import RecordVideosView from "./RecordVideosView";
import NoteEditorView from "./NoteEditorView";
import ErrorView from "./ErrorView";
import LoadingView from "./LoadingView";

import playbackController from "./playbackController";
import noteEditorController from "./noteEditorController";
import recordVideosController from "./recordVideosController";

import createControlledComponent from "./createControlledComponent";

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

export function routeToPageConfig(route, currentUser$, media, firebase) {
  // TODO: Convert all controllers to this new signature and remove this
  // migrateController wrapper
  function migrateController(controllerFn) {
    return function(props$, actions, subscription) {
      return controllerFn(
        props$,
        actions,
        currentUser$,
        media,
        firebase,
        subscription,
        () => false // navigateFn is a no-op
      );
    };
  }

  switch (route.name) {
    case "root":
    case "view-song":
      return {
        component: createControlledComponent(
          migrateController(playbackController),
          PlaybackView,
          ["play", "pause", "playCommands$"],
          LoadingView
        ),
        sidebarVisible: true
      };
    case "record-videos":
      return {
        component: createControlledComponent(
          migrateController(recordVideosController),
          RecordVideosView,
          [
            "startRecording",
            "stopRecording",
            "editSong",
            "dismissError",
            "clearVideoClip",
            "playCommands$",
            "pause",
            "play"
          ],
          LoadingView
        ),
        sidebarVisible: true
      };
    case "note-editor":
      return {
        component: createControlledComponent(
          migrateController(noteEditorController),
          NoteEditorView,
          [
            "changeCellsPerBeat",
            "changePlaybackStartPosition",
            "editSong",
            "pause",
            "play",
            "playCommands$",
            "save"
          ],
          LoadingView
        ),
        sidebarVisible: false
      };
    default:
      return {
        component: createControlledComponent(
          () => Observable.of({}),
          ErrorView,
          LoadingView
        ),
        sidebarVisible: true
      };
  }
}

const urlHistory = createHistory();

export const currentLocation$ = Observable.create(observer => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});
