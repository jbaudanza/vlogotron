import React from 'react';
import ReactDOM from 'react-dom';
import QwertyHancock from './qwerty-hancock';

import SvgAssets from './SvgAssets';
import Link from './Link';

import './style.scss'

window.main = function(node) {
  ReactDOM.render(<DemoApp />, node);
};

const audioContext = new AudioContext();

// TODO NEXT:
// - Extract and display audio somehow
//   Options:
//      - Use scriptProcessor node.
//      - Use decodeAudioData
//      - Do something server side


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
    if (this.props.stream) {
      videoEl = <video key="recorder" muted ref={this.setVideoStream} />;
    } else if (this.props.src) {
      videoEl = <video key="playback" src={this.props.src} />
    } else {
      videoEl = (
        <div className='empty-video'>
          <svg version="1.1" width="50px" height="50px">
            <use xlinkHref='#video-record' fill="#eee" />
          </svg>
        </div>
      );
    }

    let linkEl;
    if (this.props.stream) {
      linkEl = <Link onClick={this.props.onStop}>Stop recording</Link>;
    } else {
      linkEl = <Link onClick={this.props.onRecord}>Record</Link>;
    }

    return (
      <div className='video-row'>
        <div className='note-label'>{this.props.note}</div>
        {videoEl}
        {linkEl}
      </div>
    );
  }
}

Row.propTypes = {
  onRecord: React.PropTypes.func.isRequired,
  onStop:   React.PropTypes.func.isRequired
};


const BLOCK_SIZE = 16384;

class DemoApp extends React.Component {
  constructor() {
    super();

    this.onDataAvailable = this.onDataAvailable.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onStopComplete = this.onStopComplete.bind(this);
    this.onAudioProcess = this.onAudioProcess.bind(this);
    this.onStreamGranted = this.onStreamGranted.bind(this);

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

  onStopComplete() {
    if (this.chunks.length > 0) {
      console.log(this.chunks[0].type);

      const blob = new Blob(this.chunks, { type: this.chunks[0].type });

      // TODO: call URL.revokeObjectURL() somewhere
      const videoURL = window.URL.createObjectURL(blob);
      console.log(videoURL);
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

    //
    // Start Media Recorder
    //
    this.chunks = [];
    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = this.onDataAvailable;
    this.recorder.onstop = this.onStopComplete;
    this.recorder.start();

    this.setState({stream: stream});
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

  render() {
    return (
      <div>
        <SvgAssets />
        <div className='video-scroller'>
        {
          notes.map((note) => (
            <Row
                note={note}
                key={note}
                src={this.state.videoData[note]}
                recording={this.state.recording === note}
                stream={this.state.recording === note ? this.state.stream : null}
                onRecord={this.onRecord.bind(this, note)}
                onStop={this.onStop.bind(this, note)} />
          ))
        }
        </div>
        {this.state.timeStamp ? (<div>{this.state.timeStamp}</div>) : null}
        <div id="keyboard"></div>
      </div>
    );
  }
}

