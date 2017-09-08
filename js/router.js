/* @flow */
import * as React from "react";

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

import type { Media } from "./mediaLoading";

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
  [`/song-boards/${id}`, "play-song-board", "songBoardId"],
  [`/song-boards/${id}/edit`, "edit-song-board", "songBoardId"],
  [`/song-boards/${id}/collab`, "collab-song-board", "songBoardId"]
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
  media: Media,
  firebase: Object
): Function {
  // TODO: Convert all controllers to this new signature and remove this
  // migrateController wrapper
  function migrateController(controllerFn) {
    return function(props$, actions, subscription) {
      return controllerFn(
        props$,
        actions,
        props$.map(props => props.currentUser),
        media,
        firebase,
        subscription
      );
    };
  }

  switch (route.name) {
    case "root":
    case "view-song":
    case "play-song-board":
      return createControlledComponent(
        migrateController(playbackController),
        PlaybackView,
        ["play", "pause", "playCommands$"],
        LoadingView
      );
    case "edit-song-board":
    case "collab-song-board":
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
