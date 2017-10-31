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
import type { NoteConfiguration } from "./mediaLoading";

// $FlowFixMe: Flow doesn't support scss
import "./VideoGrid.scss";

export const notes: Array<number> = [
  48, // C3
  50, // D3
  52, // E3
  53, // F3
  55, // G3
  57, // A3
  59, // B3
  60, // C4
  62, // D4
  64, // E4
  65, // F4
  67, // G4
  69, // A4
  71, // B4
  72, // C5
  74 // D5
];

// prettier-ignore
const noteLabels = ["do", "re", "mi", "fa", "so", "la", "ti"];

type VideoCellProps = React.ElementProps<typeof VideoCell>;

type Props = {
  playCommands$: Object,
  readonly: boolean,
  noteConfiguration: NoteConfiguration,
  countdownUntilRecord?: number,
  durationRecorded?: number,
  onStartRecording?: Function,
  onStopRecording?: Function,
  onAdjust?: number => void,
  onClear?: number => void,
  noteBeingRecorded?: number,
  mediaStream?: MediaStream,
  loading: Object,
  pitchCorrection?: number
};

type State = {
  playing: { [number]: ?number }
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
      .subscribe({
        next: this.onPlayCommand,
        error: e => console.error(e)
      });
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.playCommands$ !== this.props.playCommands$) {
      this.subscription.unsubscribe();
      this.subscription = nextProps.playCommands$.subscribe(this.onPlayCommand);
    }
  }

  onPlayCommand(command: UIPlaybackCommand) {
    const note = command.midiNote;
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

  propsForCell(index: number, note: number): VideoCellProps {
    const props: VideoCellProps = {
      playbackStartedAt: this.state.playing[note],
      note: note,
      readonly: this.props.readonly,
      spinner: !!this.props.loading[note],
      label: noteLabels[index % noteLabels.length],
      octave: Math.floor(index / noteLabels.length) + 1,
      audioContext: this.context.audioContext
    };

    if (this.props.noteConfiguration[note]) {
      props.videoClipSources = this.props.noteConfiguration[note].sources;
      props.playbackParams = this.props.noteConfiguration[note].playbackParams;
    }

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
    function reduceToCommands(lastCommand, note: ?number) {
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
          .map(gesture => gesture.element)
          .startWith(touch.firstEl)
          .map(
            x => (x instanceof HTMLElement ? parseInt(x.dataset.note) : null)
          ) // Map to current note
          .distinctUntilChanged()
          .concatWith(null)
          .scan(reduceToCommands, {})
      );
    }
  }
  render() {
    return (
      <TouchableArea
        className="video-container"
        ref={this.bindTouchableArea}
        enabled
      >
        {notes.map((note: number, index) => (
          <VideoCell key={note} {...this.propsForCell(index, note)} />
        ))}
      </TouchableArea>
    );
  }
}

VideoGrid.contextTypes = {
  audioContext: PropTypes.object
};
