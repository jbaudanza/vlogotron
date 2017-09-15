/* @flow */

import * as React from "react";
import * as firebase from "firebase";

import Overlay from "./Overlay";
import createControlledComponent from "./createControlledComponent";
import combineTemplate from "./combineTemplate";

import { Observable } from "rxjs/Observable";

import { videoClipById } from "./mediaLoading";
import { videoClipsForSongBoard } from "./database";
import SynchronizedVideo from "./SynchronizedVideo";
import audioContext from "./audioContext";

type OuterProps = {
  songBoardId: string,
  onClose: string
};

type InnerProps = {
  onClose: string,
  videoClipSources: Array<VideoClipSources>
};

class CreateVideoClipOverlay extends React.Component<InnerProps> {
  render() {
    return (
      <Overlay onClose={this.props.onClose}>
        {this.props.videoClipSources.map(sources => (
          <SynchronizedVideo
            key={sources.clipId}
            width={100}
            height={100}
            videoClipId={sources.clipId}
            videoClipSources={sources}
            playbackStartedAt={null}
            playbackParams={{
              trimStart: 0,
              trimEnd: 1,
              playbackRate: 1,
              gain: 1
            }}
            audioContext={audioContext}
          />
        ))}
      </Overlay>
    );
  }
}

// Start with null so that combineLatest fires immediately.
function videoClipByIdWithNull(clipId) {
  return videoClipById(clipId).startWith(null);
}

function controller(
  props$: Observable<OuterProps>,
  actions,
  subscription
): Observable<InnerProps> {
  const videoClipIds$ = props$
    .map(p => p.songBoardId)
    .distinctUntilChanged()
    .switchMap(songBoardId =>
      videoClipsForSongBoard(firebase.database(), songBoardId)
    )
    .startWith([]);

  // TODO: The problem with switchMap is that it's going to re-query everything
  // anytime the list of ids change
  const videoClipSources$ = videoClipIds$
    .switchMap(ids => Observable.combineLatest(ids.map(videoClipByIdWithNull)))
    .map(ids => ids.filter(id => id != null));

  return combineTemplate({
    onClose: props$.map(props => props.onClose),
    videoClipSources: videoClipSources$
  });
}

export default createControlledComponent(
  controller,
  CreateVideoClipOverlay,
  []
);
