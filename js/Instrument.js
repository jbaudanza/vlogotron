import React from 'react';
import ReactDOM from 'react-dom';


import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {Subscription} from 'rxjs/Subscription';

import VideoGrid from './VideoGrid';
import PianoRollWrapper from './PianoRollWrapper';
import Link from './Link';
import {bindAll, omit, includes, identity, remove, times} from 'lodash';
import {findIndex, filter, concat} from 'lodash';

import VideoClipStore from './VideoClipStore';
import {startRecording} from './RecordingStore';
import {playCommands$ as scriptedPlayCommands$} from './VideoClipStore';
import {startPlayback, audioLoading$, getAudioBuffer} from './VideoClipStore';

import colors from './colors';
import {findParentNode} from './domutils';

import {songs} from './song';


const notes = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
].map(note => note + '4').concat(['C5', 'C#5', 'D5', 'D#5'])


// TODO: This is duplicated in VideoClipStore
function startCountdown(countdownSeconds, interval) {
  return Observable.interval(interval)
      .take(countdownSeconds)
      .map(x => countdownSeconds - x - 1)
      .filter(x => x > 0) // Leave out the last 0 value
      .startWith(countdownSeconds)
      .share();
}


function SongPlaybackButton(props) {
  return (
    <Link className='play-button' onClick={props.onClick}>
      <svg version="1.1" width="40px" height="40px">
        <use xlinkHref={props.isPlaying ? '#pause-marks' : '#play-arrow'} />
      </svg>
      <span className='song-title'>
        {props.title}
      </span>
    </Link>
  );
}


function reduceEditsToSong(song, edit) {
  function matcher(edit, note) {
    return note[0] === edit.note && note[1] === edit.beat;
  }

  switch(edit.action) {
    case 'create':
      return concat(song, [[edit.note, edit.beat, edit.duration]]);
    case 'delete':
      return filter(song, (note) => !matcher(edit, note));
    case 'move':
      const index = findIndex(song, matcher.bind(null, edit.from));
      if (index !== -1) {
        const oldDuration = song[index][2];
        return concat(
          filter(song, (v, i) => i !== index), // remove old note
          [[edit.to.note, edit.to.beat, oldDuration]] // add new note
        );
      } else {
        return song;
      }
    default:
      return song;
  }
}

const metronomeBuffer = getAudioBuffer('/metronome.mp3').audioBuffer;

export default class Instrument extends React.Component {
  constructor() {
    super();
    bindAll(this,
      'onClear', 'onClickPlay', 'onClickRecord', 'bindPianoRoll',
      'bindVideoGrid', 'onChangePlaybackStartPosition'
    );

    this.state = {
      recording: null,
      playing: {},
      playbackStartPosition: null,
      currentSong: songs['marry-had-a-little-lamb']
    };
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  onChangePlaybackStartPosition(value) {
    this.setState({playbackStartPosition: value});
  }

  bindVideoGrid(component) {
    this.subscription.add(component.playCommands$$.subscribe((stream$) => {
      this.playCommands$.next(stream$)
    }));
  }

  bindPianoRoll(component) {
    component.edits$
      .scan(reduceEditsToSong, this.state.currentSong)
      .subscribe((v) => this.setState({currentSong: v}));
  }

  componentWillMount() {
    this.stopRecording$ = new Subject();
    this.subscription = new Subscription();

    // This is a higher-order stream of stream of play/pause commands
    this.playCommands$ = new Subject();

    this.pauseActions$ = new Subject();

    this.videoClipStore = new VideoClipStore(this.playCommands$);

    this.subscription.add(this.videoClipStore.videoClips$.subscribe((obj) => {
      this.setState({videoClips: obj})
    }));

    this.subscription.add(audioLoading$.subscribe((value) => {
      this.setState({loading: value})
    }));
  }

  onClear(note) {
    this.videoClipStore.clearClip(note);
  }

  onRecord(note) {
    // TODO: What happens if the component is unmounted during a recording process
    const stopSignal$ = this.stopRecording$.take(1);

    const result = startRecording(note, stopSignal$);

    this.setState({recording: note});
    stopSignal$.subscribe({complete: () => this.setState({recording: null}) })

    result.stream.then((stream) => this.setState({stream}));

    result.countdown$
        .takeUntil(stopSignal$)
        .subscribe({
          next: (countdown) => this.setState({countdown}),
          complete: () => this.setState({countdown: null})
        });

    result.media.then(([videoBlob, audioBuffer]) => {
      this.videoClipStore.addMedia(note, result.clipId, videoBlob, audioBuffer)
    })
  }

  onStop(note) {
    this.stopRecording$.next(note);
  }

  onClickRecord() {
    // TODO: This bpm shouldn't be hardcoded
    const bpm = 120;
    const countdown = 8;
    const interval = (60/bpm);

    metronomeBuffer.then((buffer) => {
      const startTime = this.context.audioContext.currentTime + 0.125;

      times(countdown, (i) => {
        const source = this.context.audioContext.createBufferSource();
        if (i%4 == 0) {
          source.playbackRate.value = 2;
        }
        source.buffer = buffer;
        source.connect(this.context.audioContext.destination);
        source.start(startTime + i * interval);
      });

      startCountdown(countdown, interval * 1000).subscribe({
        next: (x) => this.setState({keyboardCountdown: x}),
        complete: () => this.setState({keyboardCountdown: null})
      });

    });
  }

  onClickPlay(songId) {
    if (this.state.songId) {
      this.pauseActions$.next(songId);
    }

    if (this.state.songId !== songId) {
      const song = (songId === 'current' ? this.state.currentSong : songs[songId]);
      const playback = this.videoClipStore.startPlayback(
          song, (this.state.playbackStartPosition || 0), this.pauseActions$.take(1)
      );

      this.setState({
        songId: songId,
        playbackPosition$: playback.position
      });

      playback.finished.then(() => this.setState({songId: null, playbackPosition$: null}));
    }
  }

  render() {
    return (
      <div className='instrument'>
        <VideoGrid
          loading={this.state.loading}
          readonly={this.props.readonly}
          videoClips={this.state.videoClips}
          onStartRecording={this.onRecord}
          onStopRecording={this.onStop}
          onClear={this.onClear}
          playCommands$={this.videoClipStore.playCommands$}
          ref={this.bindVideoGrid}
          />

        {
          /*
        <PianoRollWrapper
          notes={this.state.currentSong}
          ref={this.bindPianoRoll}
          playing={this.state.playing}
          playbackPosition$={this.state.playbackPosition$}
          playbackStartPosition={this.state.playbackStartPosition}
          onChangePlaybackStartPosition={this.onChangePlaybackStartPosition}
          onClickPlay={this.onClickPlay.bind(this, 'current')}
          onClickRecord={this.onClickRecord}
          countdown={this.state.keyboardCountdown}
          />
          */
        }

        {/*
        <SongPlaybackButton
            isPlaying={this.state.songId === 'happy-birthday'}
            onClick={this.onClickPlay.bind(this, 'happy-birthday')}
            title="Happy birthday" />

        <SongPlaybackButton
            isPlaying={this.state.songId === 'marry-had-a-little-lamb'}
            onClick={this.onClickPlay.bind(this, 'marry-had-a-little-lamb')}
            title="Mary had a little lamb" />
        */}
      </div>
    );
  }
}

Instrument.propTypes = {
  readonly: React.PropTypes.bool
};

Instrument.contextTypes = {
  audioContext: React.PropTypes.object
};
