import PropTypes from "prop-types";
import React from "react";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { omit, bindAll } from "lodash";

import TouchableArea from "./TouchableArea";
import VideoCell from "./VideoCell";

import "./VideoGrid.scss";

// prettier-ignore
export const notes = ["C3", "D3", "E3", "F3",
               "G3", "A3", "B3", "C4",
               "D4", "E4", "F4", "G4",
               "A4", "B4", "C5", "D5"];

// prettier-ignore
const noteLabels = ["do", "re", "mi", "fa", "so", "la", "ti"];

export default class VideoGrid extends React.Component {
  constructor(props) {
    super(props);
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

  componentWillReceiveProps(nextProps) {
    if (nextProps.playCommands$ !== this.props.playCommands$) {
      this.subscription.unsubscribe();
      this.subscription = nextProps.playCommands$.subscribe(this.onPlayCommand);
    }
  }

  onPlayCommand(command) {
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
    this.componentWillUnmount$.complete({});
  }

  propsForCell(index, note) {
    const props = {
      videoClip: this.props.videoClips[note],
      playbackStartedAt: this.state.playing[note],
      note: note,
      readonly: this.props.readonly,
      spinner: !!this.props.loading[note],
      label: noteLabels[index % noteLabels.length],
      octave: Math.floor(index / noteLabels.length) + 1
    };

    if (!this.props.readonly) {
      Object.assign(props, {
        onStartRecording: this.props.onStartRecording.bind(this, note),
        onStopRecording: this.props.onStopRecording.bind(this, note),
        onClear: this.props.onClear.bind(this, note),
        onTrim: this.props.onTrim.bind(this, note)
      });
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

  bindTouchableArea(touchableArea) {
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
          .map(x => (x ? x.dataset.note : null)) // Map to current note
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
          <VideoCell
            key={note}
            {...this.propsForCell(index, note)}
            audioContext={this.context.audioContext}
          />
        ))}
      </TouchableArea>
    );
  }
}

VideoGrid.propTypes = {
  playCommands$: PropTypes.object.isRequired,
  readonly: PropTypes.bool.isRequired,
  videoClips: PropTypes.object.isRequired,
  countdownUntilRecord: PropTypes.number,
  durationRecorded: PropTypes.number,
  mediaStream: PropTypes.object,
  onStartRecording: PropTypes.func,
  onStopRecording: PropTypes.func,
  onClear: PropTypes.func,
  noteBeingRecorded: PropTypes.string,
  loading: PropTypes.object.isRequired
};

VideoGrid.contextTypes = {
  audioContext: PropTypes.object
};
