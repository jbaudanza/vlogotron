/* @flow */

import * as React from "react";
import * as firebase from "firebase";

import Overlay from "./Overlay";
import createControlledComponent from "./createControlledComponent";
import combineTemplate from "./combineTemplate";

import type { Observable } from "rxjs/Observable";

import { videoClipsForSongBoard } from "./database";

type OuterProps = {
  songBoardId: string,
  onClose: string
};

type InnerProps = {
  onClose: string,
  videoClipIds: Array<string>
};

class CreateVideoClipOverlay extends React.Component<InnerProps> {
  render() {
    return (
      <Overlay onClose={this.props.onClose}>
        {this.props.videoClipIds.map(id => <div key={id}>{id}</div>)}
      </Overlay>
    );
  }
}

function controller(
  props$: Observable<OuterProps>,
  actions,
  subscription
): Observable<InnerProps> {
  const videoClipIds$ = props$
    .distinctUntilChanged((x, y) => x.songBoardId === y.songBoardId)
    .switchMap(props =>
      videoClipsForSongBoard(firebase.database(), props.songBoardId)
    )
    .startWith([]);

  return combineTemplate({
    onClose: props$.map(props => props.onClose),
    videoClipIds: videoClipIds$
  });
}

export default createControlledComponent(
  controller,
  CreateVideoClipOverlay,
  []
);
