import {
  pick, pickBy, includes, identity, omit, without, mapValues, flatten, max,
  clone, forEach, values, sum, isEmpty
} from 'lodash';

import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

import {animationFrame} from 'rxjs/scheduler/animationFrame';

import {playbackSchedule} from './playbackSchedule';

import audioContext from './audioContext';


import promiseFromTemplate from './promiseFromTemplate';
import {getArrayBuffer} from './http';

import {playCommands$ as midiPlayCommands$} from './midi';
import {playCommands$ as keyboardPlayCommands$} from './keyboard';
import {currentRoute$, currentUser$} from './router2';


function reduceToLocalUrls(acc, obj) {
  if (obj.blob) {
    return Object.assign({}, acc, {[obj.note]: {
      clipId: obj.clipId,
      sources: [{
        src: URL.createObjectURL(obj.blob),
        type: obj.blob.type
      }]}}
    );
  } else {
    return omit(acc, obj.note);
  }
}


const refs$ = currentRoute$
  .map((route) => {
    if (route.uid)
      return refsForUids(route.uid)
    else
      return null;
  });


function mapEventSnapshotToActiveClipIds(snapshot) {
  const uploadedNotes = {};
  const transcodedClips = [];

  snapshot.forEach(function(child) {
    const event = child.val();
    let note = event.note;

    // All new notes should have an octave. Some legacy ones don't
    if (event.note && !note.match(/\d$/)) {
      note += '4';
    }

    if (event.type === 'uploaded') {
      uploadedNotes[note] = event.clipId;
    }

    if (event.type === 'cleared') {
      delete uploadedNotes[note];
    }

    if (event.type === 'transcoded') {
      transcodedClips.push(event.clipId);
    }
  });

  return pickBy(uploadedNotes, (v) => includes(transcodedClips, v));
}


const formats = ['webm', 'mp4', 'ogv'];


function mapClipIdToPromise(ref, clipId) {
  function urlFor(clipId, suffix) {
    return ref.child(clipId + suffix).getDownloadURL()
  }

  return promiseFromTemplate({
    clipId: clipId,
    sources: formats.map(format => ({
      src: urlFor(clipId, '.' + format),
      type: "video/" + format
    })),
    poster: urlFor(clipId, '.png'),
    audioUrl: urlFor(clipId, '-audio.mp4')
  });
}

function reduceClipIdsToPromises(ref, acc, clipIds) {
  const next = {
    exists: clone(acc.exists), promises: []
  };

  forEach(clipIds, (clipId, note) => {
    if (!(clipId in next.exists)) {
      next.promises.push(
        mapClipIdToPromise(ref, clipId)
            .then((result) => ({[note]: result}))
      );
      next.exists[clipId] = true;
    }
  });

  return next;
}

function mapRefsToRemoteUrls(refs) {
  if (refs) {
    return Observable
        .fromEvent(refs.events.orderByKey(), 'value')
        .map(mapEventSnapshotToActiveClipIds)
        .scan(reduceClipIdsToPromises.bind(null, refs.videos), {exists: {}})
        .mergeMap((obj) => Observable.merge(...obj.promises))
        .scan((acc, obj) => Object.assign({}, acc, obj), {});
  } else {
    return Promise.resolve({});
  }
}

/*
  Emits objects that look like:
  {
    [note]: {
      clipId: 'abcd',
      sources: [...],
      poster: 'http://asdfadf'
    }
  }
*/
const remoteUrls$ = refs$.switchMap(mapRefsToRemoteUrls).startWith({});

function decodeAudioData(arraybuffer) {
  // Safari doesn't support the Promise syntax for decodeAudioData, so we need
  // to make the promise ourselves.
  return new Promise(audioContext.decodeAudioData.bind(audioContext, arraybuffer));
}

export function getAudioBuffer(url, progressSubscriber) {
  const http = getArrayBuffer(url);
  http.audioBuffer = http.response.then(decodeAudioData);
  return http;
}

// Audio buffers will be pushed here as they are recorded.
// {note: 'A', clipId: 'xasdf', buffer: AudioBuffer}
const newAudioBuffers$ = new Subject();

function reduceToLocalAudioBuffers(acc, obj) {
  if (obj.buffer) {
    return Object.assign({}, acc, {[obj.note]: obj.buffer});
  } else {
    return omit(acc, obj.note);
  }
}

const localAudioBuffers$ = currentRoute$.switchMap(function(route) {
  if (route.mode === 'record' && route.uid) {
    return newAudioBuffers$.scan(reduceToLocalAudioBuffers, {}).startWith({});
  } else {
    return Observable.of({});
  }
});

function reduceToAudioBuffers(acc, noteToUrlMap) {
  const next = {
    httpMap: clone(acc.httpMap || {}),
    promises: [],
    progressList: [],
    newUrls: []
  };

  forEach(noteToUrlMap, (url, note) => {
    if (!next.httpMap[url]) {
      const http = getAudioBuffer(url);

      next.promises.push(
        http.audioBuffer.then(buffer => ({[note]: buffer}))
      );
      next.progressList.push(http.progress);
      next.newUrls.push(url);

      next.httpMap[url] = http;
    }
  });

  next.active = values(noteToUrlMap)
      .map(url => next.httpMap[url])
      .filter(identity)

  return next;
}

const loadingContext$ = remoteUrls$
  .map(o => mapValues(o, v => v.audioUrl)) // { [note]: [url], ... }
  .scan(reduceToAudioBuffers, {});


const http$ = loadingContext$
  .flatMap(c => (
    Observable.from(values(pick(c.httpMap, c.newUrls)))
  ));


const loaded$ = http$
  .scan((acc, http) => acc.concat(http), [])
  .switchMap((list) => Observable.combineLatest(
    list.map(http => http.loaded)
  ))
  .map(sum)
  .startWith(0);

const total$ = http$
  .flatMap(http => http.contentLength)
  .scan((i, j) => i + j, 0);


// XXX: Left off here. Why is the loaded greater than the total sometimes?
//  - Maybe the progressEvent fires before the content-length header is ready
const progress$ = Observable.combineLatest(loaded$, total$, (loaded, total) => loaded / total);


// High-order observable of progress event streams from all the audio buffer
// downloads currently in progress.
const progressStreams$ = loadingContext$.flatMap(x => Observable.from(x.progressList));



// Looks like { [note]: [audioBuffer], ... }
const remoteAudioBuffers$ = loadingContext$
  .mergeMap(obj => Observable.merge(...obj.promises))
  .scan((acc, obj) => Object.assign({}, acc, obj), {});

export const audioLoading$ = http$
    .flatMap((http) => Observable.of(+1).concat(http.response.then(r => -1)))
    .scan((i, j) => i + j, 0)
    .map((count) => count > 0)
    .startWith(true);

const audioBuffers$ = Observable.combineLatest(
  localAudioBuffers$,
  remoteAudioBuffers$,
  (local, remote) => Object.assign({}, local, remote)
).publishReplay().refCount();

function refsForUids(uid) {
  return {
    events:   firebase.database().ref('video-clip-events').child(uid),
    videos:   firebase.storage().ref('video-clips').child(uid),
    uploads:  firebase.storage().refFromURL('gs://vlogotron-uploads/video-clips').child(uid),
    uid:      uid
  };
}

function recordNotes(playCommands$) {
  const initialState = {
    // In progress notes. This is a map of note names to start times
    recording: {},
    // List of notes the user has recorded
    notes: []
  };

  function reducer(acc, command) {
    let recording = acc.recording;
    let notes = acc.notes;

    if (command.play) {
      if (command.play in recording) {
        console.warn('Received two play commands for the same note', command.play);
      } else {
        recording = Object.assign(
          {}, recording, {[command.play]: audioContext.currentTime}
        );
      }
    }

    if (command.pause) {
      if (command.pause in recording) {
        const startTime = recording[command.pause];
        notes = notes.concat([[
          command.pause, startTime, audioContext.currentTime - startTime
        ]]);
        recording = omit(recording, command.pause);
      } else {
        console.warn('Received a pause command without a preceeding play command', command.pause);
      }
    }

    return {recording, notes};
  }

  return playCommands$
      .scan(reducer, initialState)
      .map(state => state.notes)
      .filter(list => list.length > 0)
      .distinctUntilChanged((i, j) => i.length === j.length);
}

// TODO:
//  - track the tasks somehow
//  - display upload progress to user
//  - URL.revokeObjectURL(url)    
export default class VideoClipStore {
  constructor(touchplayCommandsStreams$) {
    const localBlobs = new Subject();
    const uploadTasks = new BehaviorSubject([]);
    const clearActions = new Subject();

    this.clearClip = function(note) {
      clearActions.next(note);
      localBlobs.next({note, blob: null});
    };

    this.addMedia = function(note, clipId, videoBlob, audioBuffer) {
      localBlobs.next({note, clipId, blob: videoBlob});
      newAudioBuffers$.next({note, clipId, buffer: audioBuffer});
    }

    const scriptedPlayCommandStreams$ = new Subject();

    // Use a reference counting scheme to merge multiple command streams into
    // one unified stream to control playback.
    const livePlayCommands$ =
        Observable.merge(
          touchplayCommandsStreams$,
          Observable.of(midiPlayCommands$, keyboardPlayCommands$)
        )
        .mergeAll()
        .scan(reduceMultipleCommandStreams, {refCounts: {}})
        .map(x => x.command);

    this.playCommands$ = Observable.merge(
      scriptedPlayCommandStreams$.concatAll(),
      subscribeToAudioPlayback(livePlayCommands$)
    )

    const localBlobChanges$ = Observable.combineLatest(
      localBlobs,
      currentUser$.map((user) => user ? refsForUids(user.uid) : null)
    )

    localBlobChanges$.subscribe(function([change, refs]) {
      if (!(change.blob && refs))
        return;

      const uploadRef = refs.uploads.child(change.clipId);

      const task = uploadRef.put(change.blob);
      uploadTasks.next(uploadTasks._value.concat(task));

      task.then(function() {
        refs.events.push({type: 'uploaded', clipId: change.clipId, note: change.note});
        uploadTasks.next(without(uploadTasks._value, task))
      });
    });

    Observable.combineLatest(refs$.filter(identity), clearActions)
      .subscribe(function([refs, note]) {
        refs.events.push({type: 'cleared', note: note});
      });

    const localUrls = currentRoute$.switchMap(function(route) {
      if (route.mode === 'record' && route.uid) {
        return localBlobs.scan(reduceToLocalUrls, {}).startWith({});
      } else {
        return Observable.of({});
      }
    });

    this.videoClips$ = Observable.combineLatest(
        localUrls,
        remoteUrls$,
        (local, remote) => Object.assign({}, remote, local)
    );

    this.startPlayback = function(song, position, playUntil$) {
      const result = startPlayback(song, position, playUntil$);
      scriptedPlayCommandStreams$.next(result.playCommandsForVisuals$);
      return result;
    }
  }
}


function subscribeToAudioPlayback(playCommands$) {
  const activeNodes = {};

  const subject = new Subject();

  playCommands$
    .withLatestFrom(audioBuffers$)
    .subscribe(([cmd, audioBuffers]) => {
      if (cmd.play && audioBuffers[cmd.play]) {
        activeNodes[cmd.play] = makeNode(audioBuffers[cmd.play]);
        activeNodes[cmd.play].start();
      }

      if (cmd.pause && activeNodes[cmd.pause]) {
        activeNodes[cmd.pause].stop();
      }

      subject.next(Object.assign({when: audioContext.currentTime}, cmd));
    });

  return subject.asObservable();
}


function timestampToBeats(timestamp, bpm) {
  return (timestamp / 60.0) * bpm;
}

function beatsToTimestamp(beats, bpm) {
  return (beats / bpm) * 60;
}

function startPlayback(song, startPosition, playUntil$) {
  const bpm = 120;

  const playbackStartedAt = audioContext.currentTime + 0.125;

  const truncatedSong = song
      .filter(note => note[1] >= startPosition)
      .map(note => [note[0], note[1] - startPosition, note[2]])

  function mapToNotes(beatWindow) {
    const [beatFrom, beatTo] = beatWindow;
    return truncatedSong.filter((note) => note[1] >= beatFrom && note[1] < beatTo);
  }

  const songLengthInBeats = max(truncatedSong.map(note => note[1] + note[2]));

  const playCommandsForVisuals$ = Observable.from(flatten(truncatedSong.map(function(note) {
    const startAt = playbackStartedAt + beatsToTimestamp(note[1], bpm);
    const stopAt =  startAt + beatsToTimestamp(note[2], bpm);

    function makeEvent(obj, when) {
      return Observable.of(
        Object.assign({when}, obj)
      ).delay((when - audioContext.currentTime) * 1000);
    }

    return [
        makeEvent({play: note[0]}, startAt), makeEvent({pause: note[0]}, stopAt)
    ];
  }))).mergeAll().takeUntil(playUntil$);

  // Returns the time window (in beats) that need to be scheduled
  function makeBeatWindow(lastWindow, playbackUntilTimestamp) {
    return [
      lastWindow[1],
      timestampToBeats(playbackUntilTimestamp - playbackStartedAt, bpm)
    ];
  }

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.9;
  gainNode.connect(audioContext.destination);
  // Silence all audio when the pause button is hit
  playUntil$.subscribe(x => gainNode.gain.value = 0);

  playbackSchedule(audioContext)
      .takeUntil(playUntil$)
      .scan(makeBeatWindow, [null, 0])
      // TODO: This really should be takeUntil with a predicate function, but
      // that doesn't exist. Right now we're emitting one more than we need to.
      .takeWhile(beatWindow => beatWindow[0] < songLengthInBeats)
      .map(mapToNotes)
      .withLatestFrom(audioBuffers$)
      .subscribe({
        next([commands, audioBuffers]) {
          commands.forEach((command) => {
            const audioBuffer = audioBuffers[command[0]];
            if (audioBuffer) {
              const startAt = playbackStartedAt + beatsToTimestamp(command[1], bpm);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNode);

              let offset;
              if (audioContext.currentTime > startAt) {
                offset = audioContext.currentTime - startAt;
                console.warn('scheduling playback late.', offset);
              } else {
                offset = 0;
              }
              source.start(0, offset, beatsToTimestamp(command[2], bpm));
            } else {
              console.warn('missing audiobuffer for', command[0])
            }
          })
        }
      });

  const position$ = Observable
      .of(0, animationFrame)
      .repeat()
      .map(() => timestampToBeats(audioContext.currentTime - playbackStartedAt, bpm))
      .filter(beat => beat >= 0)
      .takeWhile(beat => beat < songLengthInBeats)
      .takeUntil(playUntil$)
      .map(beat => beat + startPosition);

  return {
    playCommandsForVisuals$: playCommandsForVisuals$,
    position: position$,
    finished: Observable.merge(
        playUntil$,
        Observable.of(1).delay(beatsToTimestamp(songLengthInBeats, bpm) * 1000
    )).first().toPromise()
  }
};


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

function adjustRefCount(countObject, key, change) {
  return Object.assign(
      {},
      countObject,
      {[key]: (countObject[key] || 0) + change}
  );
}