/* @flow */

import * as React from "react";
import * as firebase from "firebase";
import styled from "styled-components";

import createControlledComponent from "./createControlledComponent";
import combineTemplate from "./combineTemplate";

import { Observable } from "rxjs/Observable";

import { videoClipSourcesById } from "./mediaLoading";
import type { VideoClipSources } from "./mediaLoading";
import { videoClipsForSongBoard, updateSongBoard } from "./database";
import audioContext from "./audioContext";
import { midiNoteToLabel } from "./midi";

import Overlay from "./Overlay";
import SynchronizedVideo from "./SynchronizedVideo";
import PlayButton from "./PlayButton";
import ActionLink from "./ActionLink";

type OuterProps = {
  songBoardId: string,
  onClose: string,
  note: number,
  currentUser: Firebase$User
};

type InnerProps = {
  onClose: string,
  videoClips: Array<VideoClip>
};

type ActionCallbacks = {
  onPickVideoClip: string => void
};

type VideoClip = {
  id: string,
  sources: VideoClipSources
};

class CreateVideoClipOverlay
  extends React.Component<InnerProps & ActionCallbacks> {
  render() {
    return (
      <StyledOverlay onClose={this.props.onClose}>
        <h1>Pick a video</h1>
        {this.props.videoClips.map(videoClip => (
          <VideoClipView
            key={videoClip.id}
            videoClipSources={videoClip.sources}
            onPickVideoClip={this.props.onPickVideoClip.bind(
              null,
              videoClip.id
            )}
          />
        ))}
      </StyledOverlay>
    );
  }
}

// Start with null so that combineLatest fires immediately.
function videoClipByIdWithNull(videoClipId: string): Observable<?VideoClip> {
  const obs$: Observable<?VideoClip> = videoClipSourcesById(
    videoClipId
  ).map(sources => ({ sources, id: videoClipId }));
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
  actions.pickVideoClip$
    .withLatestFrom(props$, (videoClipId, props) => ([{
      type: "update-video-clip",
      videoClipId,
      note: midiNoteToLabel(props.note),
      uid: props.currentUser.uid
    }, props.songBoardId]))
    .subscribe(([event, songBoardId]) => {
      updateSongBoard(firebase.database(), songBoardId, event);
    });

  const videoClipIds$ = props$
    .map(p => p.songBoardId)
    .distinctUntilChanged()
    .switchMap(songBoardId =>
      videoClipsForSongBoard(firebase.database(), songBoardId)
    )
    .startWith([]);

  // TODO: The problem with switchMap is that it's going to re-query everything
  // anytime the list of ids change
  const videoClips$ = videoClipIds$
    .switchMap(ids => Observable.combineLatest(ids.map(videoClipByIdWithNull)))
    .map(removeNulls);

  return combineTemplate({
    onClose: props$.map(props => props.onClose),
    videoClips: videoClips$
  });
}

const defaultPlaybackParams = {
  trimStart: 0,
  trimEnd: 1,
  playbackRate: 1,
  gain: 1
};

function noop() {}

type VideoClipProps = {
  onPickVideoClip: (videoClipId: string) => void,
  videoClipSources: VideoClipSources
};

function VideoClipView(props: VideoClipProps) {
  return (
    <VideoWrapper>
      <SynchronizedVideo
        width={100}
        height={100}
        videoClipSources={props.videoClipSources}
        playbackStartedAt={null}
        playbackParams={defaultPlaybackParams}
        audioContext={audioContext}
      />
      <StyledPlayButton
        size={15}
        isPlaying={false}
        onClickPlay={noop}
        onClickPause={noop}
      />
      <PickButton onClick={props.onPickVideoClip}>
        pick
      </PickButton>
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

export default createControlledComponent(controller, CreateVideoClipOverlay, [
  "pickVideoClip"
]);
