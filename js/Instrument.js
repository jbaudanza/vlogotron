import React from 'react';
import ReactDOM from 'react-dom';


import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {Subscription} from 'rxjs/Subscription';

import Spin from 'antd/lib/spin';
import 'antd/lib/spin/style/css';

import TouchableArea from './TouchableArea';
import PianoRollWrapper from './PianoRollWrapper';
import PianoKeys from './PianoKeys';
import Link from './Link';
import {bindAll, omit, includes, identity, remove} from 'lodash';
import {findIndex, filter, concat} from 'lodash';

import VideoClipStore from './VideoClipStore';
import {startRecording} from './RecordingStore';
import {subscribeToAudioPlayback} from './VideoClipStore';
import {playCommands$ as scriptedPlayCommands$} from './VideoClipStore';
import {startPlayback, audioLoading$} from './VideoClipStore';

import VideoCell from './VideoCell';

import colors from './colors';
import {findParentNode} from './domutils';
import {playCommands$ as midiPlayCommands$} from './midi';
import {playCommands$ as keyboardPlayCommands$} from './keyboard';

import {songs} from './song';


const notes = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
].map(note => note + '4').concat(['C5', 'C#5', 'D5', 'D#5'])


function adjustRefCount(countObject, key, change) {
  return Object.assign(
      {},
      countObject,
      {[key]: (countObject[key] || 0) + change}
  );
}


function reduceMultipleCommandStreams(last, command) {
  const nextCommand = {};

  if (command.play && !last.refCounts[command.play]) {
    nextCommand.play = command.play;
  }

  if (command.pause && last.refCounts[command.pause] === 1) {
    nextCommand.pause = command.pause;
  }

  let refCounts = last.refCounts;
  if (command.play) {
    refCounts = adjustRefCount(refCounts, command.play, +1);
  }

  if (command.pause) {
    refCounts = adjustRefCount(refCounts, command.pause, -1);
  }

  return {
    refCounts: refCounts,
    command: nextCommand
  };
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


export default class Instrument extends React.Component {
  constructor() {
    super();
    bindAll(this, 'onClear', 'onTouchStart', 'onClickPlay', 'bindPianoRoll');

    this.state = {
      recording: null,
      playing: {},
      currentSong: [],
    };
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  bindPianoRoll(component) {
    component.edits$
      .scan(reduceEditsToSong, [])
      .subscribe((v) => this.setState({currentSong: v}));
  }

  onStartPlayback(note) {
    const videoEl = document.getElementById('playback-' + note);
    if (videoEl) {
      videoEl.currentTime = 0;

      // TODO: This returns a promise, and technically we shouldn't issue a
      // pause until the promise resolves.
      videoEl.play();
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

  componentWillMount() {
    this.stopRecording$ = new Subject();
    this.subscription = new Subscription();

    // This is a higher-order stream of stream of play/pause commands
    this.playCommands$ = new Subject();

    // Use a reference counting scheme to merge multiple command streams into
    // one unified stream to control playback.
    const mergedCommands$ = Observable.merge(
          this.playCommands$,
          Observable.of(midiPlayCommands$, keyboardPlayCommands$)
        )
        .mergeAll()
        .scan(reduceMultipleCommandStreams, {refCounts: {}})
        .map(x => x.command);

    this.subscription.add(Observable.merge(mergedCommands$, scriptedPlayCommands$).subscribe((command) => {
      if (command.play) {
        this.onStartPlayback(command.play);
      }
      if (command.pause) {
        this.onStopPlayback(command.pause);
      }
    }));

    this.pauseActions$ = new Subject();

    this.videoClipStore = new VideoClipStore();

    subscribeToAudioPlayback(mergedCommands$);

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

  propsForCell(note) {
    const props = {
      videoClip: this.state.videoClips[note],
      note: note,
      recording: !!this.state.recording,
      onStartRecording: this.onRecord.bind(this, note),
      onStopRecording: this.onStop.bind(this, note),
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

  onTouchStart(stream$) {
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

    this.playCommands$.next(
        stream$
          .concat(Observable.of(null))
          .map(x => x ? x.dataset.note : null) // Map to current note
          .distinctUntilChanged()
          .scan(reduceToCommands, {})
    );
  }

  onClickPlay(songId) {
    if (this.state.songId) {
      this.pauseActions$.next(songId);
    }

    if (this.state.songId !== songId) {
      const song = (songId === 'current' ? this.state.currentSong : songs[songId]);
      const playback = startPlayback(song, this.pauseActions$.take(1));

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
        <Spin tip="Loading" size="large" spinning={this.state.loading}>
          <TouchableArea className='video-container' onTouchStart={this.onTouchStart}>
          {
            notes.map((note) => <VideoCell key={note} {...this.propsForCell(note)} />)
          }
          </TouchableArea>
        </Spin>

        <PianoRollWrapper
          notes={this.state.currentSong}
          ref={this.bindPianoRoll}
          playing={this.state.playing}
          playbackPosition$={this.state.playbackPosition$}
          onClickPlay={this.onClickPlay.bind(this, 'current')} />

        <SongPlaybackButton
            isPlaying={this.state.songId === 'happy-birthday'}
            onClick={this.onClickPlay.bind(this, 'happy-birthday')}
            title="Happy birthday" />

        <SongPlaybackButton
            isPlaying={this.state.songId === 'marry-had-a-little-lamb'}
            onClick={this.onClickPlay.bind(this, 'marry-had-a-little-lamb')}
            title="Mary had a little lamb" />

        {
          // <PianoKeys orientation='horizontal' playing={this.state.playing} onTouchStart={this.onTouchStart} />
        }
      </div>
    );
  }
}

Instrument.propTypes = {
  readonly: React.PropTypes.bool
};
