/* @flow */
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

export function navigate(href: string) {
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
  [`/songs/${id}/(remix)/note-editor`, "note-editor", "songId", "remix"],
  [`/song-board/${id}`, "play-song-board", "songId"],
  [`/song-board/${id}/edit`, "edit-song-board", "songId"],
  [`/song-board/${id}/collab`, "collab-song-board", "songId"]
];

export type Route = {
  name: string,
  params: { [string]: string }
};

export function pathnameToRoute(pathname: string): Route {
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

export function routeToViewComponent(
  route: Route,
  currentUser$: Observable<Object>,
  media: Object,
  firebase: Object
): Function {
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
      return createControlledComponent(
        migrateController(playbackController),
        PlaybackView,
        ["play", "pause", "playCommands$"],
        LoadingView
      );
    case "record-videos":
      return createControlledComponent(
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
      );
    case "note-editor":
      return createControlledComponent(
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
      );
    default:
      return ErrorView;
  }
}

const urlHistory = createHistory();

export const currentLocation$ = Observable.create(observer => {
  observer.next(urlHistory.location);
  return urlHistory.listen(observer.next.bind(observer));
});
