import React from 'react';
import ReactDOM from 'react-dom';


import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {Subscription} from 'rxjs/Subscription';

import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';

import 'rxjs/add/operator/concat';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeAll';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeUntil';

import TouchableArea from './TouchableArea';
import PianoKeys from './PianoKeys';
import {bindAll, omit, includes, identity} from 'lodash';

import VideoClipStore from './VideoClipStore';
import RecordingStore from './RecordingStore';
import {subscribeToAudioPlayback} from './VideoClipStore';

import VideoCell from './VideoCell';

import colors from './colors';
import {findParentNode} from './domutils';
import {playCommands$ as midiPlayCommands$} from './midi';
import {playCommands$ as keyboardPlayCommands$} from './keyboard';


const notes = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];


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


export default class Instrument extends React.Component {
  constructor() {
    super();
    bindAll(this, 'onClear', 'onTouchStart');

    this.state = {
      recording: null,
      playing: {}
    };
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
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
    this.actions$ = new Subject();
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

    this.subscription.add(mergedCommands$.subscribe((command) => {
      if (command.play) {
        this.onStartPlayback(command.play);
      }
      if (command.pause) {
        this.onStopPlayback(command.pause);
      }
    }));

    // TODO: Only instantiate this during a record session
    this.recordingStore = new RecordingStore(this.actions$);

    this.videoClipStore = new VideoClipStore(this.recordingStore.addedClips$);

    // TODO: This subscription stuff is kinda gross
    this.subscription.add(
      this.recordingStore.activeNote$.subscribe(note => this.setState({recording: note}))
    );

    this.subscription.add(
      this.recordingStore.mediaStream$.subscribe(stream => this.setState({stream}))
    );

    this.subscription.add(
      this.recordingStore.countdown$.subscribe(countdown => this.setState({countdown}))
    );

    subscribeToAudioPlayback(mergedCommands$);

    this.subscription.add(this.videoClipStore.videoClips$.subscribe((obj) => {
      this.setState({videoClips: obj})
    }));
  }

  onClear(note) {
    this.videoClipStore.clearClip(note);
  }

  onRecord(note) {
    this.actions$.next({note, type: 'record'});
  }

  onStop() {
    this.actions$.next({type: 'stop'});
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

  render() {
    return (
      <div>
        <TouchableArea className='video-container' onTouchStart={this.onTouchStart}>
        {
          notes.map((note) => <VideoCell key={note} {...this.propsForCell(note)} />)
        }
        </TouchableArea>
        <div id='keyboard' />
        <PianoKeys playing={this.state.playing} onTouchStart={this.onTouchStart} />
      </div>
    );
  }
}

Instrument.propTypes = {
  readonly: React.PropTypes.bool
};
