import React from 'react';
import ReactDOM from 'react-dom';
import QwertyHancock from './qwerty-hancock';

import {bindAll, omit} from 'lodash';

import classNames from 'classnames';
import SvgAssets from './SvgAssets';
import Link from './Link';
import LoginOverlay from './LoginOverlay';

import VideoClipStore from './VideoClipStore';

import './style.scss'

import {Observable} from 'rxjs/Observable';
import {interval} from 'rxjs/Observable/interval';
import {Subject} from 'rxjs/Subject';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/map';

import bindComponentToObservable from './bindComponentToObservable'

window.main = function(node) {
  ReactDOM.render(<DemoApp />, node);
};


const audioContext = new (window.AudioContext || window.webkitAudioContext)();


function startRecording(stream, mimeType) {
  const recorder = new MediaRecorder(stream, {mimeType: mimeType});
  recorder.ondataavailable = onDataAvailable;
  recorder.start();

  const progress = new Subject();
  const chunks = [];

  function onDataAvailable(event) {
    progress.next(event.timeStamp);
    chunks.push(event.data);
  }

  const promise = new Promise(function(resolve, reject) {
    recorder.onstop = function() {
      if (chunks.length > 0) {
        resolve(new Blob(chunks, { type: chunks[0].type }));
      } else {
        resolve(null);
      }
    };
  });

  function stop() {
    recorder.stop();
    return promise;
  }

  return [progress, stop];
}

// TODO: sync this with css with some WebPack magic?
const activeColor = '#18BC9C';
const redColor = '#bc1838';

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
        <div className='countdown-label'>
          <div className='text'>Sing along with the tone. Recording in</div>
          <div className='number'>{this.props.countdown}</div>
        </div>
      );
    }

    if (this.props.stream) {
      videoEl = <video key="recorder" muted ref={this.setVideoStream} />;

      if (!this.props.countdown) {
        stopActionEl = (
          <Link onClick={this.props.onStop} className='stop-action'>
            Click to stop recording
            <svg version="1.1" width="10px" height="10px" className='record-status'>
              <circle cx="5" cy="5" r="5" fill={redColor}>
                <animate
                        attributeType="XML"
                        attributeName="opacity"
                        calcMode="discrete"
                        dur="0.75s"
                        values="0;1"
                        keyTimes="0;0.5"
                        repeatCount="indefinite" />
              </circle>
            </svg>
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
          <svg version="1.1" width="75px" height="75px" className='background'>
            <use xlinkHref='#video-record' fill={fill} />
          </svg>
          <div className='record-prompt'>
            <svg version="1.1" width="20px" height="20px">
              <circle cx="10" cy="10" r="10" fill={redColor} />
            </svg>
            <div>
              Record a clip
            </div>
          </div>
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
      'onKeyDown', 'onKeyUp', 'onAudioProcess', 'onStreamGranted', 'onClear',
      'onLogin'
    );

    this.state = {
      recording: null,
      playing: {},
      showLoginOverlay: false
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

  componentWillMount() {
    this.videoClipStore = new VideoClipStore();
    this.videoClipStore.urls.subscribe((obj) => {
      this.setState({videoClipUrls: obj})
    });
  }

  onKeyDown(note, frequency) {
    note = note.substr(0, note.length-1);
    const videoEl = document.getElementById('playback-' + note);
    if (videoEl) {
      videoEl.currentTime = 0;
      videoEl.play();
    }

    this.state.playing[note] = true;
    this.forceUpdate();
  }

  onClear(note) {
    this.videoClipStore.clearClip(note);
  }

  onAudioProcess(event) {
    //console.log(event);
  }

  onStreamGranted(stream) {
    //
    // Grab audio stream
    //
    // const audioSource = audioContext.createMediaStreamSource(stream);

    // const recorderNode = audioContext.createScriptProcessor(
    //   BLOCK_SIZE,               // buffer size
    //   audioSource.channelCount, // input channels
    //   audioSource.channelCount  // output channels
    // );
 
    // audioSource.connect(recorderNode);
    // recorderNode.onaudioprocess = this.onAudioProcess;

    // // TODO: It seems like this has to be hooked up to get the onaudoprocess
    // // event to fire.
    // recorderNode.connect(audioContext.destination);

    // TODO: Provide a way to cancel this
    const stopTone = startTone(this.state.recording);

    interval(1000)
        .map(x => 5-x)
        .take(5)
        .subscribe(
          (x) => this.setState({countdown: x}),
          null,
          (() => {
            this.setState({countdown: null});

            // I think to grab the audio track, we need to do a script processor node
            const [progress, stopRecord] = startRecording(this.state.stream, 'video/webm');
            this.stopRecord = stopRecord;

            stopTone();
          })
        )

    this.setState({stream: stream});
  }

  onRecord(note) {
    const constraints = {audio: true, video: true};
    navigator.mediaDevices.getUserMedia(constraints)
      .then(this.onStreamGranted)
      .catch(() => this.setState({recording: null}));

    this.setState({recording: note});
  }

  onStop() {
    if (this.stopRecord) {
      this.stopRecord().then((blob) => {
        if (blob) {
          this.videoClipStore.addClip(this.state.recording, blob);
        }

        if (this.state.stream) {
          const tracks = this.state.stream.getTracks();
          tracks.forEach((t) => t.stop());
        }

        this.setState({recording: null, timeStamp: null, stream: null});
      });

      delete this.stopRecord;
    }
  }

  propsForCell(note) {
    const props = {
      src: this.state.videoClipUrls[note],
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

  onLogin(providerString) {
    const provider = new firebase.auth[providerString + 'AuthProvider']();
    firebase.auth().signInWithPopup(provider);
  }

  render() {
    return (
      <div>
        <SvgAssets />
        {
          this.state.showLoginOverlay ? (
            <LoginOverlay
              onClose={() => this.setState({showLoginOverlay: false})}
              onLogin={this.onLogin} />
          ) : null
        }
        <header className='page-header'>
          <div className='content'>
            <div className="logo">
              <svg version="1.1" width="20px" height="20px" fill="white">
                <use xlinkHref='#piano' />
              </svg>
              <span>
                Vlogotron
              </span>
            </div>
            <Link onClick={() => this.setState({showLoginOverlay: true})}>
              Create your own
            </Link>
          </div>
        </header>
        <div className='video-container'>
        {
          notes.map((note) => <Cell key={note} {...this.propsForCell(note)} />)
        }
        </div>
        <div id="keyboard" />
        <div className='credits'>
          <span>Made with </span>
          <svg version="1.1" width="20px" height="20px" className='background'>
            <use xlinkHref='#golden-gate' fill="#aaa" />
          </svg>
          <span>in San Francisco by </span>
          <a href="https://www.github.com/jbaudanza">Jon Baudanza</a>
        </div>
      </div>
    );
  }
}

