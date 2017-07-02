import PropTypes from "prop-types";
import React from "react";
import { Observable } from "rxjs/Observable";
import styled from "styled-components";

import Overlay from "./Overlay";
import Link from "./Link";
import TrimAdjuster from "./TrimAdjuster";
import PlayButton from "./PlayButton";
import SynchronizedVideo from "./SynchronizedVideo";

import createControlledComponent from "./createControlledComponent";

import audioContext from "./audioContext";

import { times } from "lodash";

const contentWidth = 420;

const VideoWrapper = styled.div`
  position: relative;

  .play-button {
    position: absolute;
    bottom: 5px;
    left: 5px;
  }
`;

class TrimOverlay extends React.Component {
  constructor() {
    super();
    this.state = {
      trimStart: 0.0,
      trimEnd: 1.0
    };
  }

  render() {
    return (
      <Overlay
        className="trim-overlay"
        className={this.props.className}
        onClose={this.props.onClose}
      >
        <h1>Trim video</h1>

        <VideoWrapper>
          <SynchronizedVideo
            width={contentWidth}
            videoClip={this.props.videoClip}
            audioContext={audioContext}
            playbackStartedAt={this.props.playbackStartedAt}
          />

          <PlayButton
            size={25}
            isPlaying={this.props.playbackStartedAt !== null}
            onClickPlay={this.props.onPlay}
            onClickPause={this.props.onPause}
          />
        </VideoWrapper>

        <TrimAdjuster
          audioBuffer={this.props.audioBuffer}
          width={contentWidth}
          height={50}
          trimStart={this.state.trimStart}
          trimEnd={this.state.trimEnd}
          onChangeStart={trimStart => this.setState({ trimStart })}
          onChangeEnd={trimEnd => this.setState({ trimEnd })}
        />
      </Overlay>
    );
  }
}

TrimOverlay.propTypes = {
  onClose: PropTypes.string.isRequired,
  videoClip: PropTypes.object.isRequired,
  audioBuffer: PropTypes.object.isRequired
};

const StyledTrimOverlay = styled(TrimOverlay)`
  .content {
    width: ${contentWidth}px;
    text-align: left;
  }
`;

// XXX: Duplicated in AudioPlaybackEngine
const batchTime = audioContext.baseLatency || 2 * 128 / audioContext.sampleRate;

function schedulePlaybackNow(audioContext, audioBuffer, playUntil$) {
  const startAt = audioContext.currentTime + batchTime;

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(startAt);

  const videoFinished$ = Observable.of(null).delay(audioBuffer.duration * 1000);
  const stopEarly$ = playUntil$.take(1);

  stopEarly$.subscribe(() => {
    source.stop();
    source.disconnect();
  });

  const playbackEnded$ = Observable.race(videoFinished$, stopEarly$);

  return Observable.merge(
    Observable.of(startAt),
    playbackEnded$.ignoreElements().concatWith(null)
  );
}

function controller(props$, actions) {
  const playbackStartedAt$ = actions.play$
    .withLatestFrom(props$)
    .switchMap(([action, props]) =>
      schedulePlaybackNow(audioContext, props.audioBuffer, actions.pause$)
    )
    .startWith(null);

  return Observable.combineLatest(
    props$,
    playbackStartedAt$,
    (props, playbackStartedAt) => ({
      ...props,
      playbackStartedAt
    })
  );
}

export default createControlledComponent(controller, StyledTrimOverlay, [
  "play",
  "pause"
]);
