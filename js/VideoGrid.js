import React from 'react';
import {Observable} from 'rxjs/Observable';

import {omit, bindAll} from 'lodash';

import TouchableArea from './TouchableArea';
import VideoCell from './VideoCell';

import Spin from 'antd/lib/spin';
//import 'antd/lib/spin/style/css';

import './VideoGrid.scss';


const notes = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
].map(note => note + '4').concat(['C5', 'C#5', 'D5', 'D#5'])



export default class VideoGrid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      playing: {}
    };

    bindAll(this, 'bindTouchableArea', 'onPlayCommand');
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
    const videoEl = document.getElementById('playback-' + note);
    if (videoEl) {
      videoEl.currentTime = 0;
      const promise = videoEl.play();

      // Older version of FF don't return a promise
      if (promise) {
        promise.then(() => {
          // Try to compensate for any delay in starting the video
          if (when) {
            const delta = this.context.audioContext.currentTime - when;
            if (delta > 0) {
              videoEl.currentTime = delta;
            }
          }
        }).catch(function(e) {
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
    const videoEl = document.getElementById('playback-' + note);
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }

    this.setState({playing: omit(this.state.playing, note)});
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

    if (this.props.noteBeingRecorded === note) {
      Object.assign(props, {
        mediaStream: this.props.mediaStream,
        duration: this.props.timeStamp,
        countdown: this.props.recordingCountdown
      });
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
      this.playCommands$$ = touchableArea.touches$$.map((touch) => (
        touch.movements$
          .startWith(touch.firstEl)
          .map(x => x ? x.dataset.note : null) // Map to current note
          .distinctUntilChanged()
          .concat(Observable.of(null))
          .scan(reduceToCommands, {})
      ))
    }
  }

  render() {
    return (
      <Spin tip="Loading" size="large" spinning={this.props.loading}>
        <TouchableArea className='video-container' ref={this.bindTouchableArea}>
        {
          notes.map((note) => <VideoCell key={note} {...this.propsForCell(note)} />)
        }
        </TouchableArea>
      </Spin>
    );
  }
}

VideoGrid.propTypes = {
  playCommands$:      React.PropTypes.object.isRequired,
  readonly:           React.PropTypes.bool.isRequired,
  loading:            React.PropTypes.bool.isRequired,
  videoClips:         React.PropTypes.object.isRequired,
  recordingCountdown: React.PropTypes.number,
  mediaStream:        React.PropTypes.object,
  onStartRecording:   React.PropTypes.func,
  onStopRecording:    React.PropTypes.func,
  onClear:            React.PropTypes.func,
  noteBeingRecorded:  React.PropTypes.string
};

VideoGrid.contextTypes = {
  audioContext: React.PropTypes.object
};
