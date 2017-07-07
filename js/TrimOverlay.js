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

const contentWidth = 343;

const VideoCropper = styled.div`
  position: absolute;
  overflow: hidden;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;

  video {
    height: 100%;
    margin-left: -19%;
  }
`;

const VideoWrapper = styled.div`
  position: relative;

  width: ${contentWidth}px;
  height: ${contentWidth}px;
  margin-bottom: 40px;

  .play-button {
    position: absolute;
    bottom: 5px;
    left: 5px;
  }
`;

const colors = {
  slateGrey: "#5d617a",
  darkSkyBlue: "#29bdec"
};

const barHeight = 8;
const controlHeight = 17;

const VideoPlaybackPositionWrapper = styled.div`
  position: absolute;
  height: ${controlHeight}px;
  bottom: 0;
  left: 0;
  right: 0;
`;

const VideoPlaybackPositionBar = styled.div`
  position: absolute;
  top: ${controlHeight - barHeight}px;
  bottom: 0;
  opacity: 0.75;
`;

function percentString(number) {
  return number * 100 + "%";
}

function VideoPlaybackPosition(props) {
  const svgStyle = {
    position: "absolute",
    top: 4,
    left: percentString(props.progress),
    marginLeft: "-10px"
  };
  const barLeftStyle = {
    left: 0,
    right: percentString(1 - props.progress),
    backgroundColor: colors.darkSkyBlue
  };
  const barRightStyle = {
    left: percentString(props.progress),
    right: 0,
    backgroundColor: colors.slateGrey
  };

  return (
    <VideoPlaybackPositionWrapper>
      <VideoPlaybackPositionBar style={barLeftStyle} />
      <VideoPlaybackPositionBar style={barRightStyle} />
      <svg style={svgStyle} version="1.1" width="20px" height="20px">
        <use xlinkHref="#svg-playback-position-circle" fill="white" />
      </svg>
    </VideoPlaybackPositionWrapper>
  );
}

class TrimOverlay extends React.Component {
  render() {
    return (
      <Overlay
        className="trim-overlay"
        className={this.props.className}
        onClose={this.props.onClose}
      >
        <h1>Trim video</h1>

        <VideoWrapper>
          <VideoCropper>
            <SynchronizedVideo
              videoClip={this.props.videoClip}
              audioContext={audioContext}
              trimStart={this.props.trimStart}
              playbackStartedAt={this.props.playbackStartedAt}
            />
          </VideoCropper>

          <PlayButton
            size={25}
            isPlaying={this.props.playbackStartedAt !== null}
            onClickPlay={this.props.onPlay}
            onClickPause={this.props.onPause}
          />

          <VideoPlaybackPosition progress={0.0} />
        </VideoWrapper>

        <TrimAdjuster
          audioBuffer={this.props.audioBuffer}
          trimStart={this.props.trimStart}
          trimEnd={this.props.trimEnd}
          onChangeStart={this.props.onChangeStart}
          onChangeEnd={this.props.onChangeEnd}
          width={contentWidth}
          height={50}
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
  // Disable scrolling
  .content .scroll {
    overflow: visible;
  }
`;

// XXX: Duplicated in AudioPlaybackEngine
const batchTime = audioContext.baseLatency || 2 * 128 / audioContext.sampleRate;

function schedulePlaybackNow(
  audioContext,
  trimStart,
  trimEnd,
  audioBuffer,
  playUntil$
) {
  const startAt = audioContext.currentTime + batchTime;
  const offset = trimStart * audioBuffer.duration;
  const duration = trimEnd * audioBuffer.duration - offset;

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(startAt, offset, duration);

  const videoFinished$ = Observable.of(null).delay(duration * 1000);
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
  const trimStart$ = actions.changeStart$.startWith(0).publishReplay();
  const trimEnd$ = actions.changeEnd$.startWith(1).publishReplay();

  // The source observables for these connections will end when the component
  // is unmounted, so there's no need to manage the subscriptions
  trimStart$.connect();
  trimEnd$.connect();

  const playbackStartedAt$ = actions.play$
    .withLatestFrom(props$, trimStart$, trimEnd$)
    .switchMap(([action, props, trimStart, trimEnd]) =>
      schedulePlaybackNow(
        audioContext,
        trimStart,
        trimEnd,
        props.audioBuffer,
        actions.pause$
      )
    )
    .startWith(null);

  return Observable.combineLatest(
    props$,
    trimStart$,
    trimEnd$,
    playbackStartedAt$,
    (props, trimStart, trimEnd, playbackStartedAt) => ({
      ...props,
      playbackStartedAt,
      trimStart,
      trimEnd
    })
  );
}

export default createControlledComponent(controller, StyledTrimOverlay, [
  "play",
  "pause",
  "changeStart",
  "changeEnd"
]);
