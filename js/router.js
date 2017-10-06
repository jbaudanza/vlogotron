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

const idRegExp = "([\\w-]+)";

const routes = [
  [`/`, "root"],
  [songBoardPath(idRegExp), "play-song-board", "songBoardId"],
  [recordVideosPath(idRegExp), "record-videos", "songBoardId"],
  [noteEditorPath(idRegExp), "note-editor", "songBoardId"]
];

export function noteEditorPath(songBoardId: string): string {
  return `/song-boards/${songBoardId}/note-editor`;
}

export function recordVideosPath(songBoardId: string): string {
  return `/song-boards/${songBoardId}/record-videos`;
}

export function songBoardPath(songBoardId: string): string {
  return `/song-boards/${songBoardId}`;
}

export type Route =
  | {
      name: "root",
      params: {}
    }
  | {
      name: "not-found",
      params: {}
    }
  | {
      name: "play-song-board",
      params: { songBoardId: string }
    }
  | {
      name: "record-videos",
      params: { songBoardId: string }
    }
  | {
      name: "note-editor",
      params: { songBoardId: string }
    };

export function pathnameToRoute(pathname: string): Route {
  for (let i = 0; i < routes.length; i++) {
    const entry = routes[i];

    const match = pathname.match(new RegExp("^" + entry[0] + "$"));

    if (match) {
      const params = fromPairs(
        entry.slice(2).map((key, j) => [key, match[1 + j]])
      );

      // $FlowFixMe
      return {
        name: entry[1],
        params: params
      };
    }
  }

  return { name: "not-found", params: {} };
}

export function routeToViewComponent(route: Route, media: Media): Function {
  // TODO: Convert all controllers to this new signature and remove this
  // migrateController wrapper
  function migrateController(controllerFn) {
    return function(props$, actions, subscription) {
      return controllerFn(props$, actions, media, subscription);
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
