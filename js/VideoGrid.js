import React from "react";
import { Observable } from "rxjs/Observable";

import { omit, bindAll } from "lodash";

import TouchableArea from "./TouchableArea";
import VideoCell from "./VideoCell";

import "./VideoGrid.scss";

const notes = ["C3", "D3", "E3", "F3",
               "G3", "A3", "B3", "C4",
               "D4", "E4", "F4", "G4",
               "A4", "B4", "C5", "D5"];

const noteLabels = ["DO", "RE", "MI", "FA",
                    "SO", "LA", "TI", "do",
                    "re", "mi", "fa", "so",
                    "la", "ti", "d", "r"]

export default class VideoGrid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      playing: {}
    };

    bindAll(this, "bindTouchableArea", "onPlayCommand");
  }

  componentWillMount() {
    this.subscription = this.props.playCommands$.subscribe(this.onPlayCommand);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.playCommands$ !== this.props.playCommands$) {
      this.subscription.unsubscribe();
      this.subscription = nextProps.playCommands$.subscribe(this.onPlayCommand);
    }
  }

  onPlayCommand(command) {
    if (command.play) {
      this.onStartPlayback(command.play, command.when);
    }
    if (command.pause) {
      this.onStopPlayback(command.pause);
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
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

    this.setState({ playing: omit(this.state.playing, note) });
  }

  propsForCell(note) {
    const props = {
      videoClip: this.props.videoClips[note],
      note: note,
      playing: !!this.state.playing[note],
      readonly: this.props.readonly
    };

    if (!this.props.readonly) {
      Object.assign(props, {
        onStartRecording: this.props.onStartRecording.bind(this, note),
        onStopRecording: this.props.onStopRecording.bind(this, note),
        onClear: this.props.onClear.bind(this, note)
      });
    }

    if (this.props.noteBeingRecorded) {
      if (this.props.noteBeingRecorded === note) {
        Object.assign(props, {
          mediaStream: this.props.mediaStream,
          countdown: this.props.countdownUntilRecord,
          durationRecorded: this.props.durationRecorded
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
        {notes.map((note, idx) => (
          <VideoCell key={note} label={noteLabels[idx]} {...this.propsForCell(note)} />
        ))}
      </TouchableArea>
    );
  }
}

VideoGrid.propTypes = {
  playCommands$: React.PropTypes.object.isRequired,
  readonly: React.PropTypes.bool.isRequired,
  videoClips: React.PropTypes.object.isRequired,
  countdownUntilRecord: React.PropTypes.number,
  durationRecorded: React.PropTypes.number,
  mediaStream: React.PropTypes.object,
  onStartRecording: React.PropTypes.func,
  onStopRecording: React.PropTypes.func,
  onClear: React.PropTypes.func,
  noteBeingRecorded: React.PropTypes.string
};

VideoGrid.contextTypes = {
  audioContext: React.PropTypes.object
};
