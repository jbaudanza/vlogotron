import React from 'react';

import {interval} from 'rxjs/observable/interval';
import {Subject} from 'rxjs/Subject';
import {fromEvent} from 'rxjs/observable/fromEvent';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/map';

import QwertyHancock from './qwerty-hancock';
import {bindAll, omit, includes} from 'lodash';

import VideoClipStore from './VideoClipStore';

import VideoCell from './VideoCell';

import colors from './colors';
import {findParentNode} from './domutils';

const notes = [
  'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'
];

// const frequencies = {
//   "A":  440,
//   "A#": 466.16,
//   "B":  493.88,
//   "C":  523.25,
//   "C#": 554.37,
//   "D":  587.33,
//   "D#": 622.25,
//   "E":  659.25,
//   "F":  698.46,
//   "F#": 739.99,
//   "G":  783.99,
//   "G#": 830.6
// };

// Lower octave
const frequencies = {
  "A":  220.00,
  "A#": 233.08,
  "B":  246.94,
  "C":  261.63,
  "C#": 277.18,
  "D":  293.66,
  "D#": 311.13,
  "E":  329.63,
  "F":  349.23,
  "F#": 369.99,
  "G":  392.00,
  "G#": 415.30
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const documentMouseMove$ = fromEvent(document, 'mousemove');
const documentMouseUp$ = fromEvent(document, 'mouseup');


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


export default class Instrument extends React.Component {
  constructor() {
    super();
    bindAll(this,'onKeyDown', 'onKeyUp', 'onStreamGranted', 'onClear');

    this.state = {
      recording: null,
      playing: {}
    };
  }

  componentDidMount() {
    const keyboard = new QwertyHancock({
                   id: 'keyboard',
                   width: 600,
                   height: 150,
                   octaves: 1,
                   startNote: 'A3',
                   whiteNotesColour: 'white',
                   blackNotesColour: 'black',
                   hoverColour: '#f3e939',
                   activeColour: colors.active
    });

    keyboard.keyDown = this.onKeyDown;
    keyboard.keyUp = this.onKeyUp;
  }

  onKeyUp(note, frequency) {
    this.onStopPlayback(note.substr(0, note.length-1));
  }

  onKeyDown(note, frequency) {
    this.onStartPlayback(note.substr(0, note.length-1));
  }

  onStartPlayback(note) {
    const videoEl = document.getElementById('playback-' + note);
    if (videoEl) {
      videoEl.currentTime = 0;
      videoEl.play();
    }

    this.state.playing[note] = true;
    this.forceUpdate();
  }

  onMouseDownOnVideo(note) {
    const playStart$ = new Subject();

    const playUntil$ = documentMouseUp$.take(1)
    playUntil$.map(() => null).subscribe(playStart$);

    documentMouseMove$.takeUntil(playUntil$).subscribe(function(event) {
      const el = findParentNode(
        event.target,
        (node) => includes(node.classList, 'video-cell')
      );
      if (el) {
        playStart$.next(el.dataset.note);
      } else {
        playStart$.next(null);
      }
    });

    playStart$
      .distinctUntilChanged()
      .scan(
        (obj, note) => ({previous: obj.current, current: note}),
        {current: null, previous: null}
      ).subscribe((obj) => {
      if (obj.previous) {
        this.onStopPlayback(obj.previous);
      }
      if (obj.current) {
        this.onStartPlayback(obj.current);
      }
    });

    playStart$.next(note);
  }

  onStopPlayback(note) {
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

  onClear(note) {
    this.videoClipStore.clearClip(note);
  }

  onStreamGranted(stream) {
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
      onStartRecording: this.onRecord.bind(this, note),
      onStopRecording: this.onStop.bind(this, note),
      onMouseDown: this.onMouseDownOnVideo.bind(this, note),
      onClear: this.onClear.bind(this, note),
      playing: !!this.state.playing[note],
      readonly: this.props.readonly
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
        <div className='video-container'>
        {
          notes.map((note) => <VideoCell key={note} {...this.propsForCell(note)} />)
        }
      </div>
        <div id='keyboard' />
      </div>
    );
  }
}

Instrument.propTypes = {
  readonly: React.PropTypes.bool.isRequired
};
