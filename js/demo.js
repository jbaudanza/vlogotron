import React from 'react';
import ReactDOM from 'react-dom';
import QwertyHancock from './qwerty-hancock';

import {bindAll} from 'lodash';

import SvgAssets from './SvgAssets';
import Link from './Link';

import './style.scss'

window.main = function(node) {
  ReactDOM.render(<DemoApp />, node);
};

const audioContext = new AudioContext();

// TODO NEXT:
// - Add a tone during the countdown


const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

function blobToArrayBuffer(blob) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();

    reader.onload = (e) => resolve(reader.result);
    reader.onerror = (e) => reject(reader.error);

    reader.readAsArrayBuffer(blob);
  });
}

class Row extends React.Component {
  constructor() {
    super();
    this.setVideoStream = this.setVideoStream.bind(this);
  }

  setVideoStream(videoEl) {
    if (this.props.stream) {
      videoEl.srcObject = this.props.stream;
      videoEl.play();
    }
  }

  render() {
    let videoEl;
    let actionsEl;

    if (this.props.stream) {
      videoEl = <video key="recorder" muted ref={this.setVideoStream} />;
      if (this.props.countdown) {
        actionsEl = <div>Recording in {this.props.countdown}</div>;
      } else {
        actionsEl = (
          <div>
            <Link onClick={this.props.onStop}>Stop recording</Link>
            <div>{this.props.duration}</div>
          </div>
        );
      }
    } else if (this.props.src) {
      videoEl = <video key="playback" src={this.props.src} />;
      actionsEl = (
        <Link onClick={this.props.onClear}>
          Clear
        </Link>
      );
    } else {
      videoEl = (
        <div className='empty-video'>
          <svg version="1.1" width="50px" height="50px">
            <use xlinkHref='#video-record' fill="#eee" />
          </svg>
        </div>
      );
      actionsEl = (
        <div>
          <Link onClick={this.props.onRecord} enabled={!this.props.recording}>
            Record
          </Link>
          <div>{this.props.duration}</div>
        </div>
      );
    }

    return (
      <div className='video-row'>
        <div className='note-label'>{this.props.note}</div>
        {videoEl}
        {actionsEl}
      </div>
    );
  }
}

Row.propTypes = {
  onRecord:   React.PropTypes.func.isRequired,
  onStop:     React.PropTypes.func.isRequired,
  recording:  React.PropTypes.bool.isRequired,
  countdown:  React.PropTypes.number
};


const BLOCK_SIZE = 16384;

class DemoApp extends React.Component {
  constructor() {
    super();

    bindAll(this,
      'onDataAvailable', 'onKeyDown', 'onKeyUp', 'onStopComplete',
      'onAudioProcess', 'onStreamGranted', 'onClear', 'onTick');

    this.state = {
      recording: null,
      videoData: {}
    };
  }

  componentDidMount() {
    var keyboard = new QwertyHancock({
                   id: 'keyboard',
                   width: 600,
                   height: 150,
                   octaves: 2,
                   startNote: 'A3',
                   whiteNotesColour: 'white',
                   blackNotesColour: 'black',
                   hoverColour: '#f3e939'
    });

    keyboard.keyDown = this.onKeyDown;
    keyboard.keyUp = this.onKeyUp;
  }

  onKeyUp(note, frequency) {
    document.getElementById('recorded').pause();
  }

  onKeyDown(note, frequency) {
    document.getElementById('recorded').play();
    document.getElementById('recorded').currentTime = 0;
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
      console.log(this.chunks[0].type);

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

      this.setState({countdown: null});
    } else {
      this.setState({countdown: next});
      setTimeout(this.onTick, 1000);
    }
  }

  onRecord(note) {
    const constraints = {audio: true, video: true};
    navigator.mediaDevices.getUserMedia(constraints)
      .then(this.onStreamGranted);

    this.setState({recording: note});
  }

  onStop() {
    if (this.recorder) {
      this.recorder.stop();
      delete this.recorder;
    }
  }

  propsForRow(note) {
    const props = {
      src: this.state.videoData[note],
      note: note,
      recording: !!this.state.recording,
      onRecord: this.onRecord.bind(this, note),
      onStop: this.onStop.bind(this, note),
      onClear: this.onClear.bind(this, note)
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
        <div className='video-scroller'>
        {
          notes.map((note) => <Row key={note} {...this.propsForRow(note)} />)
        }
        </div>
        <div id="keyboard" />
      </div>
    );
  }
}

