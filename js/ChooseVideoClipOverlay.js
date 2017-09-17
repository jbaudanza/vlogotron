/* @flow */

import * as React from "react";
import * as firebase from "firebase";
import styled from "styled-components";

import createControlledComponent from "./createControlledComponent";
import combineTemplate from "./combineTemplate";

import { Observable } from "rxjs/Observable";

import { videoClipById } from "./mediaLoading";
import type { VideoClipSources } from "./mediaLoading";
import { videoClipsForSongBoard } from "./database";
import audioContext from "./audioContext";

import Overlay from "./Overlay";
import SynchronizedVideo from "./SynchronizedVideo";
import PlayButton from "./PlayButton";
import ActionLink from "./ActionLink";

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
      <StyledOverlay onClose={this.props.onClose}>
        <h1>Pick a video</h1>
        {this.props.videoClipSources.map((sources, i) => (
          <VideoClip key={i} videoClipSources={sources} />
        ))}
      </StyledOverlay>
    );
  }
}

// Start with null so that combineLatest fires immediately.
function videoClipByIdWithNull(clipId): Observable<?VideoClipSources> {
  const obs$: Observable<?VideoClipSources> = videoClipById(clipId);
  return obs$.startWith(null);
}

function removeNulls<T>(input: Array<T>): Array<$NonMaybeType<T>> {
  return input.filter(i => i != null);
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
    .map(removeNulls);

  return combineTemplate({
    onClose: props$.map(props => props.onClose),
    videoClipSources: videoClipSources$
  });
}

const defaultPlaybackParams = {
  trimStart: 0,
  trimEnd: 1,
  playbackRate: 1,
  gain: 1
};

function noop() {}

function VideoClip(props) {
  return (
    <VideoWrapper>
      <StyledPlayButton
        size={15}
        isPlaying={false}
        onClickPlay={noop}
        onClickPause={noop}
      />
      <PickButton>
        pick
      </PickButton>
      <SynchronizedVideo
        width={100}
        height={100}
        videoClipSources={props.videoClipSources}
        playbackStartedAt={null}
        playbackParams={defaultPlaybackParams}
        audioContext={audioContext}
      />
    </VideoWrapper>
  );
}

const StyledOverlay = styled(Overlay)`
  .content {
    width: 500px;
    height: 500px;
  }

  video {
    object-fit: cover;
    height: 100%;
    width: 100%;
  }
`;
const VideoWrapper = styled.div`
  width: 100px;
  height: 100px;
  overflow: hidden;
  display: inline-block;
  position: relative;
  margin-right: 10px;
  margin-bottom: 10px;
`;

const PickButton = styled(ActionLink)`
  position: absolute;
  bottom: 5px;
  right: 5px;
  height: 15px;
  opacity: 1;
  line-height: 15px;
`;

const StyledPlayButton = styled(PlayButton)`
  position: absolute;
  bottom: 5px;
  left: 5px;
  svg { display: block; }
`;

export default createControlledComponent(
  controller,
  CreateVideoClipOverlay,
  []
);
