import PropTypes from "prop-types";
import React from "react";
import { Observable } from "rxjs/Observable";
import styled from "styled-components";

import Overlay from "./Overlay";
import Link from "./Link";
import TrimAdjuster from "./TrimAdjuster";
import PlayButton from "./PlayButton";
import SynchronizedVideo from "./SynchronizedVideo";

import { formatSeconds } from "./format";

import createControlledComponent from "./createControlledComponent";
import createAnimatedComponent from "./createAnimatedComponent";

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

function TrimmedDiv(props) {
  const style = {
    left: percentString(props.trimStart),
    right: percentString(1 - props.trimEnd)
  };
  return (
    <div style={style} className={props.className}>
      {props.children}
    </div>
  );
}

const barHeight = 8;
const controlHeight = 17;

const VideoPlaybackPositionWrapper = styled(TrimmedDiv)`
  position: absolute;
  height: ${controlHeight}px;
  bottom: 0
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

class VideoPlaybackPosition extends React.Component {
  animationFrame(progress) {
    if (this.leftBarEl) {
      Object.assign(this.leftBarEl.style, {
        left: 0,
        right: percentString(1 - progress),
        backgroundColor: colors.darkSkyBlue
      });
    }

    if (this.rightBarEl) {
      Object.assign(this.rightBarEl.style, {
        right: 0,
        left: percentString(progress),
        backgroundColor: colors.slateGrey
      });
    }

    if (this.svgCircleEl) {
      Object.assign(this.svgCircleEl.style, {
        position: "absolute",
        left: percentString(progress),
        top: "4px",
        marginLeft: "-10px"
      });
    }
  }

  render() {
    return (
      <VideoPlaybackPositionWrapper {...this.props}>
        <VideoPlaybackPositionBar innerRef={el => this.leftBarEl = el} />
        <VideoPlaybackPositionBar innerRef={el => this.rightBarEl = el} />
        <svg
          version="1.1"
          width="20px"
          height="20px"
          ref={el => this.svgCircleEl = el}
        >
          <use xlinkHref="#svg-playback-position-circle" fill="white" />
        </svg>
      </VideoPlaybackPositionWrapper>
    );
  }
}

const AudioPlaybackPositionMarkerWrapper = styled(TrimmedDiv)`
  position: absolute;
  top: 0;
  bottom: 0;
  display: ${props => (props.playbackStartedAt ? "block" : "none")}
`;

const AudioPlaybackPositionLabel = styled.div`
  position: absolute;
  bottom: -15px;
  height: 15px;
  line-height: 15px;
  font-size: 12px;
  font-weight: 500;
  width: 38px;
  margin-left: ${-38 / 2}px;
  background-color: ${colors.darkSkyBlue};
  color: #fff;
  border-radius: 2px;
  text-align: center;
`;

const AudioPlaybackPositionLine = styled.div`
  position: absolute;
  width: 2px;
  top: 0;
  bottom: 0;
  background-color: ${colors.darkSkyBlue}
`;

class AudioPlaybackPositionMarker extends React.Component {
  animationFrame(progress, elapsed) {
    if (this.markerEl) {
      Object.assign(this.markerEl.style, {
        position: "absolute",
        top: 0,
        height: "66px",
        left: percentString(progress)
      });
    }

    if (this.labelEl) {
      this.labelEl.textContent = formatSeconds(elapsed);
    }
  }

  render() {
    return (
      <AudioPlaybackPositionMarkerWrapper {...this.props}>
        <div ref={el => this.markerEl = el}>
          <AudioPlaybackPositionLine />
          <AudioPlaybackPositionLabel innerRef={el => this.labelEl = el} />
        </div>
      </AudioPlaybackPositionMarkerWrapper>
    );
  }
}

function createPlaybackPositionAnimation(Component) {
  return createAnimatedComponent(
    Component,
    props => props.playbackStartedAt,
    (props, element) => {
      if (props.playbackStartedAt) {
        const elapsed = props.getCurrentTime() - props.playbackStartedAt;
        const progress = props.playbackStartedAt ? elapsed / props.duration : 0;
        element.animationFrame(progress, elapsed);
      } else {
        element.animationFrame(0);
      }
    }
  );
}

const AnimatedVideoPlaybackPosition = createPlaybackPositionAnimation(
  VideoPlaybackPosition
);

const AnimatedAudioPlaybackPositionMarker = createPlaybackPositionAnimation(
  AudioPlaybackPositionMarker
);

const SvgPlayArrow = (
  <svg width="9" height="17" viewBox="0 0 9 17">
    <path
      fill="#FFF"
      fillRule="evenodd"
      d="M0 17.057V0l8.507 8.529"
      opacity=".564"
    />
  </svg>
);

const PlaybackPositionText = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  opacity: 0.7;
  position: absolute;
  bottom: 15px;
  left: 40px;
`;

function secondCounterController(props$) {
  return props$
    .switchMap(props => {
      if (props.startedAt) {
        return Observable.interval(500)
          .map(() => props.getCurrentTime() - props.startedAt)
          .startWith(0);
      } else {
        return Observable.of(0);
      }
    })
    .map(seconds => ({ seconds }));
}

function SecondCounterView(props) {
  return <span>{formatSeconds(props.seconds)}</span>;
}

const SecondCounter = createControlledComponent(
  secondCounterController,
  SecondCounterView
);

function getCurrentTime() {
  return audioContext.currentTime;
}

const TrimAdjusterWrapper = styled.div`
  position: relative;
  padding-top: 10px;
`;

class TrimOverlay extends React.Component {
  render() {
    const trimmedDuration =
      this.props.audioBuffer.duration *
      (this.props.trimEnd - this.props.trimStart);

    const playbackAnimationProps = {
      getCurrentTime: getCurrentTime,
      playbackStartedAt: this.props.playbackStartedAt,
      duration: trimmedDuration,
      trimStart: this.props.trimStart,
      trimEnd: this.props.trimEnd
    };

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

          <AnimatedVideoPlaybackPosition {...playbackAnimationProps} />

          <PlaybackPositionText>
            <SecondCounter
              startedAt={this.props.playbackStartedAt}
              getCurrentTime={getCurrentTime}
            />
            {" "}
            |
            {" "}
            {formatSeconds(trimmedDuration)}
          </PlaybackPositionText>
        </VideoWrapper>

        <TrimAdjusterWrapper>
          <TrimAdjuster
            audioBuffer={this.props.audioBuffer}
            trimStart={this.props.trimStart}
            trimEnd={this.props.trimEnd}
            onChangeStart={this.props.onChangeStart}
            onChangeEnd={this.props.onChangeEnd}
            width={contentWidth}
            height={50}
          />
          <AnimatedAudioPlaybackPositionMarker {...playbackAnimationProps} />
        </TrimAdjusterWrapper>
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
