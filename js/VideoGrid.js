import PropTypes from 'prop-types';
import React from "react";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { omit, bindAll } from "lodash";

import TouchableArea from "./TouchableArea";
import VideoCell from "./VideoCell";

import "./VideoGrid.scss";

// prettier-ignore
const notes = ["C3", "D3", "E3", "F3",
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

    this.props.playCommands$
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
    this.onStartPlayback(command.noteName, command.when);

    command.duration$
      .takeUntil(this.componentWillUnmount$)
      .subscribe(() => this.onStopPlayback(command.noteName));
  }

  componentWillUnmount() {
    this.componentWillUnmount$.next({});
    this.componentWillUnmount$.complete({});
  }

  onStartPlayback(note, when) {
    const videoEl = document.getElementById("playback-" + note);
    if (videoEl) {
      videoEl.currentTime = 0;
      const promise = videoEl.play();

      // Older version of FF don't return a promise
      if (promise) {
        promise
          .then(() => {
            // Try to compensate for any delay in starting the video
            if (when) {
              const delta = this.context.audioContext.currentTime - when;
              if (delta > 0) {
                videoEl.currentTime = delta;
              }
            }
          })
          .catch(function(e) {
            // 20 = AbortError.
            // This can happen if we try to pause playback before it starts. This
            // can safely be ignored. It results in errors that look like:
            //
            //   The play() request was interrupted by a call to pause()
            //
            if (e.code !== 20) {
              throw e;
            }
          });
      }
    }

    this.state.playing[note] = true;
    this.forceUpdate();
  }

  onStopPlayback(note) {
    const videoEl = document.getElementById("playback-" + note);
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }

    this.state.playing[note] = false;
    this.forceUpdate();
  }

  propsForCell(index, note) {
    const props = {
      videoClip: this.props.videoClips[note],
      playing: !!this.state.playing[note],
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
          <VideoCell key={note} {...this.propsForCell(index, note)} />
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
