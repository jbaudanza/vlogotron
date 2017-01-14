import React from 'react';
import ReactDOM from 'react-dom';
import QwertyHancock from './qwerty-hancock';

import {bindAll, omit} from 'lodash';

import classNames from 'classnames';
import SvgAssets from './SvgAssets';
import Link from './Link';

import './style.scss'

window.main = function(node) {
  ReactDOM.render(<DemoApp />, node);
};

const audioContext = new AudioContext();

// TODO NEXT:
// - Add support for WebMidi
// - Display duration while recording
// - Add audio visualizations
// - Persist videos somehow

// TODO: sync this with css with some WebPack magic?
const activeColor = '#18BC9C';

const notes = [
  'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'
];

const frequencies = {
  "A":  440,
  "A#": 466.16,
  "B":  493.88,
  "C":  523.25,
  "C#": 554.37,
  "D":  587.33,
  "D#": 622.25,
  "E":  659.25,
  "F":  698.46,
  "F#": 739.99,
  "G":  783.99,
  "G#": 830.6
};

// Lower octave
// const frequencies = {
//   "A":  220.00,
//   "A#": 233.08,
//   "B":  246.94,
//   "C":  261.63,
//   "C#": 277.18,
//   "D":  293.66,
//   "D#": 311.13,
//   "E":  329.63,
//   "F":  349.23,
//   "F#": 369.99,
//   "G":  392.00,
//   "G#": 415.30
// };


function blobToArrayBuffer(blob) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();

    reader.onload = (e) => resolve(reader.result);
    reader.onerror = (e) => reject(reader.error);

    reader.readAsArrayBuffer(blob);
  });
}


class Cell extends React.Component {
  constructor() {
    super();
    bindAll(this, 'setVideoStream', 'onClear');
  }

  setVideoStream(videoEl) {
    if (this.props.stream) {
      videoEl.srcObject = this.props.stream;
      videoEl.play();
    }
  }

  onClear() {
    if (window.confirm('Do you want to remove this clip?')) {
      this.props.onClear();
    }
  }

  render() {
    let videoEl;
    let countdownEl;
    let stopActionEl;

    if (this.props.countdown) {
      countdownEl = (
        <div className='countdown-label'>{this.props.countdown}</div>
      );
    }

    if (this.props.stream) {
      videoEl = <video key="recorder" muted ref={this.setVideoStream} />;
      if (!this.props.countdown) {
        stopActionEl = (
          <Link onClick={this.props.onStop} className='stop-action'>
            Click to stop recording
          </Link>
        );
      }
    } else if (this.props.src) {
      videoEl = (
        <Link onClick={this.onClear}>
          <video id={'playback-' + this.props.note} key="playback" src={this.props.src} />
        </Link>
      );
    } else {
      const fill = this.props.playing ? activeColor: '#eee';
      videoEl = (
        <Link className='empty-video' onClick={this.props.onRecord} enabled={!this.props.recording}>
          <svg version="1.1" width="50px" height="50px">
            <use xlinkHref='#video-record' fill={fill} />
          </svg>
        </Link>
      );
    }

    return (
      <div className={classNames('video-cell', {playing: this.props.playing})}>
        <div className='note-label'>
          {this.props.note}
        </div>
        {videoEl}
        {countdownEl}
        {stopActionEl}
      </div>
    );
  }
}

Cell.propTypes = {
  onRecord:   React.PropTypes.func.isRequired,
  onStop:     React.PropTypes.func.isRequired,
  recording:  React.PropTypes.bool.isRequired,
  playing:    React.PropTypes.bool.isRequired,
  countdown:  React.PropTypes.number
};

function startTone(note) {
  const ramp = 0.1;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + ramp);
  gainNode.connect(audioContext.destination);

  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequencies[note];
  oscillator.connect(gainNode);
  oscillator.start();

  return function() {
    const stopTime = audioContext.currentTime + ramp;
    gainNode.gain.linearRampToValueAtTime(0, stopTime);
    oscillator.stop(stopTime);
  }
}

const BLOCK_SIZE = 16384;

class DemoApp extends React.Component {
  constructor() {
    super();

    bindAll(this,
      'onDataAvailable', 'onKeyDown', 'onKeyUp', 'onStopComplete',
      'onAudioProcess', 'onStreamGranted', 'onClear', 'onTick');

    this.state = {
      recording: null,
      videoData: {},
      playing: {}
    };
  }

  componentDidMount() {
    const keyboard = new QwertyHancock({
                   id: 'keyboard',
                   width: 600,
                   height: 150,
                   octaves: 2,
                   startNote: 'A3',
                   whiteNotesColour: 'white',
                   blackNotesColour: 'black',
                   hoverColour: '#f3e939',
                   activeColour: activeColor
    });

    keyboard.keyDown = this.onKeyDown;
    keyboard.keyUp = this.onKeyUp;
  }

  onKeyUp(note, frequency) {
    note = note.substr(0, note.length-1);
    const videoEl = document.getElementById('playback-' + note);
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }

    this.setState({playing: omit(this.state.playing, note)});
  }

  onKeyDown(note, frequency) {
    note = note.substr(0, note.length-1);
    const videoEl = document.getElementById('playback-' + note);
    if (videoEl) {
      videoEl.currentTime = 0;
      videoEl.play();
    } else {
      console.log('no video for note', note)
    }

    this.state.playing[note] = true;
    this.forceUpdate();
  }

  onClear(note) {
    if (note in this.state.videoData) {
      const url = this.state.videoData[note];
      delete this.state.videoData[note];
      this.forceUpdate(() => URL.revokeObjectURL(url));
    }
  }

  onStopComplete() {
    if (this.chunks.length > 0) {
      const blob = new Blob(this.chunks, { type: this.chunks[0].type });

      const videoURL = window.URL.createObjectURL(blob);
      this.state.videoData[this.state.recording] = videoURL;

      blobToArrayBuffer(blob).then(function(ab) {
        console.log(ab);
        console.log(ab.byteLength);
        return audioContext.decodeAudioData(ab);
      }).then((x) => console.log)
    }

    if (this.state.stream) {
      const tracks = this.state.stream.getTracks();
      tracks.forEach((t) => t.stop());
    }

    this.setState({recording: null, timeStamp: null, stream: null});
  }

  onAudioProcess(event) {
    //console.log(event);
  }

  onDataAvailable(event) {
    this.setState({timeStamp: event.timeStamp});
    this.chunks.push(event.data);
  }

  onStreamGranted(stream) {
    //
    // Grab audio stream
    //
    const audioSource = audioContext.createMediaStreamSource(stream);

    const recorderNode = audioContext.createScriptProcessor(
      BLOCK_SIZE,               // buffer size
      audioSource.channelCount, // input channels
      audioSource.channelCount  // output channels
    );
 
    audioSource.connect(recorderNode);
    recorderNode.onaudioprocess = this.onAudioProcess;

    // TODO: It seems like this has to be hooked up to get the onaudoprocess
    // event to fire.
    recorderNode.connect(audioContext.destination);

    this.setState({countdown: 3});

    // TODO: Provide a way to cancel this
    this.stopTone = startTone(this.state.recording);
    setTimeout(this.onTick, 1000);

    this.setState({stream: stream});
  }

  onTick() {
    const next = this.state.countdown - 1;

    if (next === 0) {
      this.chunks = [];
      this.recorder = new MediaRecorder(this.state.stream);
      this.recorder.ondataavailable = this.onDataAvailable;
      this.recorder.onstop = this.onStopComplete;
      this.recorder.start();

      this.stopTone();
      this.setState({countdown: null});
    } else {
      this.setState({countdown: next});
      setTimeout(this.onTick, 1000);
    }
  }

  onRecord(note) {
    const constraints = {audio: true, video: true};
    navigator.mediaDevices.getUserMedia(constraints)
      .then(this.onStreamGranted)
      .catch(() => this.setState({recording: null}));

    this.setState({recording: note});
  }

  onStop() {
    if (this.recorder) {
      this.recorder.stop();
      delete this.recorder;
    }
  }

  propsForCell(note) {
    const props = {
      src: this.state.videoData[note],
      note: note,
      recording: !!this.state.recording,
      onRecord: this.onRecord.bind(this, note),
      onStop: this.onStop.bind(this, note),
      onClear: this.onClear.bind(this, note),
      playing: !!this.state.playing[note]
    };

    if (this.state.recording === note) {
      Object.assign(props, {
        stream: this.state.stream,
        duration: this.state.timeStamp,
        countdown: this.state.countdown
      });
    }

    return props;
  }

  render() {
    return (
      <div>
        <SvgAssets />
        <div className='video-container'>
        {
          notes.map((note) => <Cell key={note} {...this.propsForCell(note)} />)
        }
        </div>
        <div id="keyboard" />
      </div>
    );
  }
}

