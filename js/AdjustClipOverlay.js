/* @flow */
import * as React from "react";
import { Observable } from "rxjs/Observable";
import styled from "styled-components";

// $FlowFixMe
import "./slider.scss";
import Slider from "rc-slider";

const SliderWithTooltip = Slider.createSliderWithTooltip(Slider);

const PlaybackParamSlider = SliderWithTooltip;

import colors from "./colors";
import Overlay from "./Overlay";
import ActionLink from "./ActionLink";
import AudioBufferView from "./AudioBufferView";
import TrimAdjuster from "./TrimAdjuster";
import PlayButton from "./PlayButton";
import SynchronizedVideo from "./SynchronizedVideo";

import { formatSeconds } from "./format";

import createControlledComponent from "./createControlledComponent";
import createAnimatedComponent from "./createAnimatedComponent";

import PitchView from "./PitchView";

import audioContext from "./audioContext";

import { times } from "lodash";

import TrimmedAudioBufferSourceNode from "./TrimmedAudioBufferSourceNode";

import type { VideoClipSources } from "./mediaLoading";
import type { PlaybackParams } from "./AudioPlaybackEngine";

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
    width: 100%;
    object-fit: cover;
  }
`;

const VideoWrapper = styled.div`
  position: relative;

  width: ${contentWidth}px;
  height: ${contentWidth}px;
  margin-bottom: 10px;

  .play-button {
    position: absolute;
    bottom: 5px;
    left: 5px;
  }
`;

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

function roundedPercentString(number) {
  return Math.floor(number * 100) + "%";
}

type PlaybackPositionAnimationProps = {
  playbackStartedAt: ?number,
  duration: number,
  playbackRate: number,
  getCurrentTime: () => number
};

const Tab = styled.a`
  display: block;
  text-decoration: none;
  color: ${colors.charcoalGrey};
  font-weight: 400;
  box-sizing: border-box;
  padding: 10px;
  border-left: 2px solid;
  border-color: ${props => (props.active ? colors.purple : "#D9DBEB")};
  cursor: ${props => (props.active ? "auto" : "pointer")};
`;

class VideoPlaybackPosition
  extends React.Component<PlaybackPositionAnimationProps> {
  leftBarEl: ?HTMLElement;
  rightBarEl: ?HTMLElement;
  svgCircleEl: ?Element;

  animationFrame(progress) {
    if (this.leftBarEl) {
      Object.assign(this.leftBarEl.style, {
        left: "0",
        right: percentString(1 - progress),
        backgroundColor: colors.darkSkyBlue
      });
    }

    if (this.rightBarEl) {
      Object.assign(this.rightBarEl.style, {
        right: "0",
        left: percentString(progress),
        backgroundColor: colors.slateGrey
      });
    }

    // TODO: If flow adds support for SVGElement, we can probably remove this
    // instanceof check
    if (
      this.svgCircleEl && this.svgCircleEl.style instanceof CSSStyleDeclaration
    ) {
      Object.assign(this.svgCircleEl.style, {
        position: "absolute",
        left: percentString(progress),
        top: "4px",
        marginLeft: "-10px"
      });
    }
  }

  componentDidUpdate() {
    if (this.props.playbackStartedAt == null) {
      this.animationFrame(0);
    }
  }

  render() {
    return (
      <VideoPlaybackPositionWrapper {...this.props}>
        <VideoPlaybackPositionBar innerRef={el => this.leftBarEl = el} />
        <VideoPlaybackPositionBar innerRef={el => this.rightBarEl = el} />

        {this.props.playbackStartedAt
          ? <svg
              ref={el => this.svgCircleEl = el}
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              width="20"
              height="21"
              viewBox="0 0 20 21"
            >
              <defs>
                <circle id="playback-position-circle-b" cx="7" cy="7" r="7" />
                <filter
                  id="playback-position-circle-a"
                  width="185.7%"
                  height="185.7%"
                  x="-42.9%"
                  y="-28.6%"
                  filterUnits="objectBoundingBox"
                >
                  <feMorphology
                    in="SourceAlpha"
                    operator="dilate"
                    radius="2"
                    result="shadowSpreadOuter1"
                  />
                  <feOffset
                    dy="2"
                    in="shadowSpreadOuter1"
                    result="shadowOffsetOuter1"
                  />
                  <feGaussianBlur
                    in="shadowOffsetOuter1"
                    result="shadowBlurOuter1"
                    stdDeviation="1"
                  />
                  <feComposite
                    in="shadowBlurOuter1"
                    in2="SourceAlpha"
                    operator="out"
                    result="shadowBlurOuter1"
                  />
                  <feColorMatrix
                    in="shadowBlurOuter1"
                    values="0 0 0 0 0.522268282 0 0 0 0 0.522268282 0 0 0 0 0.522268282 0 0 0 0.5 0"
                  />
                </filter>
              </defs>
              <g fill="none" fillRule="evenodd" transform="translate(3 2)">
                <use
                  fill="#000"
                  filter="url(#playback-position-circle-a)"
                  xlinkHref="#playback-position-circle-b"
                />
                <use
                  fill="#29BDEC"
                  stroke="#FFF"
                  strokeWidth="4"
                  xlinkHref="#playback-position-circle-b"
                />
              </g>
            </svg>
          : null}
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

const DivWithPointer = styled.div`
  // arrow pointer - http://www.cssarrowplease.com/
  &:after {
    left: 50%;
    border: solid transparent;
    content: " ";
    height: 0;
    width: 0;
    position: absolute;
    pointer-events: none;
    border-color: rgba(255, 255, 255, 0);
    border-width: ${props => props.size}px;
    margin-left: ${props => -props.size}px;

    // for pointing up
    bottom: 100%;
    border-bottom-color: ${props => props.color};

    // for pointing down
    //top: 100%;
    //border-top-color: $menu-background-color;
  }
`;

const AudioPlaybackPositionLabel = styled(DivWithPointer).attrs({
  color: colors.darkSkyBlue,
  size: 5
})`
  position: absolute;
  bottom: -23px;
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
  margin-left: -1px;
  top: 0;
  bottom: 0;
  background-color: ${colors.darkSkyBlue}
`;

class AudioPlaybackPositionMarker
  extends React.Component<
    PlaybackPositionAnimationProps & { trimStart: number, trimEnd: number }
  > {
  markerEl: ?HTMLElement;
  labelEl: ?HTMLElement;

  animationFrame(progress, elapsed) {
    if (this.markerEl) {
      Object.assign(this.markerEl.style, {
        position: "absolute",
        top: "0",
        height: "66px",
        left: percentString(progress)
      });
    }

    const textContent = formatSeconds(elapsed);
    if (this.labelEl) {
      this.labelEl.textContent = textContent;
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

function createPlaybackPositionAnimation<Props: PlaybackPositionAnimationProps>(
  Component: React.ComponentType<Props>
): React.ComponentType<Props> {
  return createAnimatedComponent(
    Component,
    (props: Props) => props.playbackStartedAt != null,
    (props: Props, element) => {
      if (props.playbackStartedAt) {
        const playbackStartedAt = props.playbackStartedAt;
        const elapsed = props.getCurrentTime() - playbackStartedAt;
        const progress = playbackStartedAt
          ? elapsed * props.playbackRate / props.duration
          : 0;
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
  padding-top: 8px;
  height: 66px;
  box-sizing: border-box;
`;

const ActionWrapper = styled.div`
  margin-top: 40px;
  text-align: center;
`;

type Props = {
  onClose: string,
  videoClipSources: VideoClipSources,
  playbackParams: PlaybackParams,
  audioBuffer: AudioBuffer,
  playbackStartedAt: ?number,
  className: string,
  onPlay: Function,
  onPause: Function,
  onChangeEnd: number => void,
  onChangeStart: number => void,
  onChangePlaybackRate: number => void,
  onChangeGain: number => void,
  onFinish: Function,
  note: number
};

type State = {
  activeTabIndex: number
};

class AdjustClipOverlay extends React.Component<Props, State> {
  constructor() {
    super();
    this.state = { activeTabIndex: 0 };
    this.setActiveTabIndex = this.setActiveTabIndex.bind(this);
    this.onChangePlaybackRate = this.onChangePlaybackRate.bind(this);
    this.onChangeGain = this.onChangeGain.bind(this);
  }

  setActiveTabIndex: (index: number) => void;
  onChangePlaybackRate: (event: Event) => void;
  onChangeGain: (event: Event) => void;

  setActiveTabIndex(index: number) {
    this.setState({ activeTabIndex: index });
  }

  onChangePlaybackRate(value: number) {
    if (this.state.activeTabIndex !== 1) this.setActiveTabIndex(1);
    this.props.onChangePlaybackRate(value);
  }

  onChangeGain(value: number) {
    if (this.state.activeTabIndex !== 0) this.setActiveTabIndex(0);
    this.props.onChangeGain(value);
  }

  render() {
    const trimmedDuration =
      this.props.audioBuffer.duration *
      (this.props.playbackParams.trimEnd - this.props.playbackParams.trimStart);

    const playbackAnimationProps = {
      getCurrentTime: getCurrentTime,
      playbackStartedAt: this.props.playbackStartedAt,
      duration: trimmedDuration,
      trimStart: this.props.playbackParams.trimStart,
      trimEnd: this.props.playbackParams.trimEnd,
      playbackRate: this.props.playbackParams.playbackRate
    };

    const trimAdjusterHeight = 51;
    const audioViewHeight = trimAdjusterHeight - 8;

    let audioViewEl = null;

    switch (this.state.activeTabIndex) {
      case 0:
        audioViewEl = (
          <AudioBufferView
            audioBuffer={this.props.audioBuffer}
            gain={this.props.playbackParams.gain}
            width={contentWidth}
            height={audioViewHeight}
          />
        );

        break;
      case 1:
        audioViewEl = (
          <PitchView
            width={contentWidth}
            height={audioViewHeight}
            audioBuffer={this.props.audioBuffer}
            targetNote={this.props.note}
            playbackRate={this.props.playbackParams.playbackRate}
          />
        );

        break;
    }

    return (
      <Overlay
        className="trim-overlay"
        className={this.props.className}
        onClose={this.props.onClose}
      >
        <VideoWrapper>
          <VideoCropper>
            <SynchronizedVideo
              videoClipSources={this.props.videoClipSources}
              playbackParams={this.props.playbackParams}
              audioContext={audioContext}
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
            {formatSeconds(
              trimmedDuration / this.props.playbackParams.playbackRate
            )}
          </PlaybackPositionText>
        </VideoWrapper>

        <TrimAdjusterWrapper>
          <TrimAdjuster
            playbackParams={this.props.playbackParams}
            onChangeStart={this.props.onChangeStart}
            onChangeEnd={this.props.onChangeEnd}
            width={contentWidth}
            height={trimAdjusterHeight}
          >
            {audioViewEl}
          </TrimAdjuster>
          <AnimatedAudioPlaybackPositionMarker {...playbackAnimationProps} />
        </TrimAdjusterWrapper>

        <div>
          <Tab
            active={0 === this.state.activeTabIndex}
            onClick={this.setActiveTabIndex.bind(null, 0)}
          >
            Volume
            <PlaybackParamSlider
              min={0}
              max={1}
              tipFormatter={roundedPercentString}
              value={this.props.playbackParams.gain}
              step={0.05}
              onChange={this.onChangeGain}
              marks={{ "0.75": "Normal" }}
            />
          </Tab>

          <Tab
            active={1 === this.state.activeTabIndex}
            onClick={this.setActiveTabIndex.bind(null, 1)}
          >
            Playback Rate
            <PlaybackParamSlider
              min={0.5}
              max={2}
              tipFormatter={roundedPercentString}
              value={this.props.playbackParams.playbackRate}
              step={0.05}
              onChange={this.onChangePlaybackRate}
              marks={{ "1": "Normal" }}
            />
          </Tab>
        </div>

        <ActionWrapper>
          <ActionLink onClick={this.props.onFinish}>
            Done
          </ActionLink>
        </ActionWrapper>
      </Overlay>
    );
  }
}

const StyledAdjustClipOverlay = styled(AdjustClipOverlay)`
  .content {
    width: ${contentWidth}px;
    padding: 50px 40px 20px 40px;
    text-align: left;
  }
  // Disable scrolling
  .content .scroll {
    overflow: visible;
    padding: 0;
  }
`;

// XXX: Duplicated in AudioPlaybackEngine
const batchTime = audioContext.baseLatency || 2 * 128 / audioContext.sampleRate;

function schedulePlaybackNow(
  audioContext,
  playbackParams,
  audioBuffer,
  playUntil$
) {
  const startAt = audioContext.currentTime + batchTime;

  const source = new TrimmedAudioBufferSourceNode(
    audioContext,
    audioBuffer,
    playbackParams
  );
  source.connect(audioContext.destination);
  source.start(startAt);

  const videoFinished$ = Observable.of(null).delay(
    source.duration / playbackParams.playbackRate * 1000
  );
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
  const initialProps$ = props$.take(1);

  const playbackParamsUpdates$ = Observable.merge(
    actions.changeStart$.map(v => ({ trimStart: v })),
    actions.changeEnd$.map(v => ({ trimEnd: v })),
    actions.changePlaybackRate$.map(v => ({ playbackRate: v })),
    actions.changeGain$.map(v => ({ gain: v }))
  );

  const playbackParams$ = Observable.merge(
    initialProps$.map(props => props.playbackParams),
    playbackParamsUpdates$
  )
    .scan((acc, update) => ({ ...acc, ...update }), {})
    .publishReplay();

  // The source observables for this connections will end when the component
  // is unmounted, so there's no need to manage the subscriptions
  playbackParams$.connect();

  actions.finish$
    .withLatestFrom(props$, playbackParams$)
    .subscribe(([value, props, playbackParams]) =>
      props.onFinish(playbackParams)
    );

  const unmount$ = props$.ignoreElements().concatWith({});

  const playbackStartedAt$ = actions.play$
    .withLatestFrom(props$, playbackParams$)
    .switchMap(([action, props, playbackParams]) =>
      schedulePlaybackNow(
        audioContext,
        playbackParams,
        props.audioBuffer,
        Observable.merge(actions.pause$, unmount$)
      )
    )
    .startWith(null);

  return Observable.combineLatest(
    props$,
    playbackStartedAt$,
    playbackParams$,
    (props, playbackStartedAt, playbackParams) => ({
      videoClipSources: props.videoClipSources,
      onClose: props.onClose,
      note: props.note,
      audioBuffer: props.audioBuffer,
      playbackStartedAt,
      playbackParams
    })
  );
}

export default createControlledComponent(controller, StyledAdjustClipOverlay, [
  "play",
  "pause",
  "changeStart",
  "changeEnd",
  "changePlaybackRate",
  "changeGain",
  "finish"
]);
