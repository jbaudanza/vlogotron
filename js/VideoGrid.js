/* @flow */

import PropTypes from "prop-types";
import * as React from "react";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import type { Subscription } from "rxjs/Subscription";

import { omit, bindAll } from "lodash";

import TouchableArea from "./TouchableArea";
import VideoCell from "./VideoCell";

import type { UIPlaybackCommand, PlaybackParams } from "./AudioPlaybackEngine";
import type { VideoClipSources } from "./mediaLoading";

// $FlowFixMe: Flow doesn't support scss
import "./VideoGrid.scss";

// prettier-ignore
export const notes = ["C3", "D3", "E3", "F3",
               "G3", "A3", "B3", "C4",
               "D4", "E4", "F4", "G4",
               "A4", "B4", "C5", "D5"];

// prettier-ignore
const noteLabels = ["do", "re", "mi", "fa", "so", "la", "ti"];

type VideoCellProps = React.ElementProps<typeof VideoCell>;

type Props = {
  playCommands$: Object,
  readonly: boolean,
  videoClipSources: { [string]: VideoClipSources },
  playbackParams: { [string]: PlaybackParams },
  videoClipIds: { [string]: string },
  countdownUntilRecord?: number,
  durationRecorded?: number,
  onStartRecording?: Function,
  onStopRecording?: Function,
  onAdjust?: (string) => void,
  onClear?: (string) => void,
  noteBeingRecorded?: string,
  mediaStream?: MediaStream,
  loading: Object,
  pitchCorrection?: number
};

type State = {
  playing: Object
};

export default class VideoGrid extends React.Component<Props, State> {
  playCommands$$: Observable<Object>;
  componentWillUnmount$: Subject<Object>;
  subscription: Subscription;

  constructor() {
    super();
    this.state = {
      playing: {}
    };

    bindAll(this, "bindTouchableArea", "onPlayCommand");
  }

  componentWillMount() {
    this.componentWillUnmount$ = new Subject();

    this.subscription = this.props.playCommands$
      .takeUntil(this.componentWillUnmount$)
      .subscribe(this.onPlayCommand);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.playCommands$ !== this.props.playCommands$) {
      this.subscription.unsubscribe();
      this.subscription = nextProps.playCommands$.subscribe(this.onPlayCommand);
    }
  }

  onPlayCommand(command: UIPlaybackCommand) {
    const note = command.noteName;
    this.state.playing[note] = command.when;
    this.forceUpdate();

    command.duration$.takeUntil(this.componentWillUnmount$).subscribe(() => {
      this.state.playing[note] = null;
      this.forceUpdate();
    });
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    this.componentWillUnmount$.next({});
    this.componentWillUnmount$.complete();
  }

  propsForCell(index: number, note: string): VideoCellProps {
    const props: VideoCellProps = {
      videoClipSources: this.props.videoClipSources[note],
      videoClipId: this.props.videoClipIds[note],
      playbackParams: this.props.playbackParams[note],
      playbackStartedAt: this.state.playing[note],
      note: note,
      readonly: this.props.readonly,
      spinner: !!this.props.loading[note],
      label: noteLabels[index % noteLabels.length],
      octave: Math.floor(index / noteLabels.length) + 1,
      audioContext: this.context.audioContext
    };

    if (!this.props.readonly) {
      if (this.props.onStartRecording) {
        props.onStartRecording = this.props.onStartRecording.bind(this, note);
      }

      if (this.props.onStopRecording) {
        props.onStopRecording = this.props.onStopRecording.bind(this, note);
      }

      if (this.props.onAdjust) {
        props.onAdjust = this.props.onAdjust.bind(this, note);
      }

      if (this.props.onClear) {
        props.onClear = this.props.onClear.bind(this, note);
      }
    }

    if (this.props.noteBeingRecorded) {
      if (this.props.noteBeingRecorded === note) {
        Object.assign(props, {
          mediaStream: this.props.mediaStream,
          countdown: this.props.countdownUntilRecord,
          durationRecorded: this.props.durationRecorded,
          pitchCorrection: this.props.pitchCorrection
        });
      } else {
        props.readonly = true;
      }
    }

    return props;
  }

  bindTouchableArea(touchableArea: ?TouchableArea) {
    // Reduces into something like: {'play': 'C', 'pause': 'A'}
    function reduceToCommands(lastCommand, note) {
      const nextCommand = {};

      if (note != null) {
        nextCommand.play = note;
      }

      if (lastCommand.play) {
        nextCommand.pause = lastCommand.play;
      }

      return nextCommand;
    }

    if (touchableArea) {
      this.playCommands$$ = touchableArea.touches$$.map(touch =>
        touch.movements$
          .startWith(touch.firstEl)
          .map(x => (x instanceof HTMLElement ? x.dataset.note : null)) // Map to current note
          .distinctUntilChanged()
          .concatWith(null)
          .scan(reduceToCommands, {})
      );
    }
  }
  render() {
    return (
      <TouchableArea className="video-container" ref={this.bindTouchableArea}>
        {notes.map((note, index) => (
          <VideoCell key={note} {...this.propsForCell(index, note)} />
        ))}
      </TouchableArea>
    );
  }
}

VideoGrid.contextTypes = {
  audioContext: PropTypes.object
};
