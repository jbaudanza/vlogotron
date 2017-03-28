import {Observable} from 'rxjs/Observable';
import {
  pickBy, includes, clone, forEach, values, pick, sum, mapValues, identity
} from 'lodash';

import promiseFromTemplate from './promiseFromTemplate';

import {playCommands$ as midiPlayCommands$} from './midi';
import {playCommands$ as keyboardPlayCommands$} from './keyboard';

import audioContext from './audioContext';

import {getArrayBuffer} from './http';


export default function playbackController(params, actions) {
  const videoClips$ = videoClipsForUid(params.uid);

  // Use a reference counting scheme to merge multiple command streams into
  // one unified stream to control playback.
  const livePlayCommands$ =
      Observable.merge(
        actions.playCommands$$,
        Observable.of(midiPlayCommands$, keyboardPlayCommands$)
      )
      .mergeAll()
      .scan(reduceMultipleCommandStreams, {refCounts: {}})
      .map(x => x.command);

  const loadingContext$ = videoClips$
    .map(o => mapValues(o, v => v.audioUrl)) // { [note]: [url], ... }
    .scan(reduceToAudioBuffers, {});

  // Looks like { [note]: [audioBuffer], ... }
  const audioBuffers$ = loadingContext$
    .mergeMap(obj => Observable.merge(...obj.promises))
    .scan((acc, obj) => Object.assign({}, acc, obj), {});

  const http$ = loadingContext$
    .flatMap(c => (
      Observable.from(values(pick(c.httpMap, c.newUrls)))
    ));

  const loading$ = http$
      .flatMap((http) => Observable.of(+1).concat(http.response.then(r => -1)))
      .scan((i, j) => i + j, 0)
      .map((count) => count > 0)
      .startWith(true);

  const audioEngineState = {
    playCommands: livePlayCommands$,
    audioBuffers: audioBuffers$
  };

  const viewState = Observable.combineLatest(
    videoClips$, loading$,
    (videoClips, loading) => ({videoClips, loading})
  );

  return {audioEngineState, viewState};
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

function adjustRefCount(countObject, key, change) {
  return Object.assign(
      {},
      countObject,
      {[key]: (countObject[key] || 0) + change}
  );
}

const formats = ['webm', 'mp4', 'ogv'];

function refsForUid(uid) {
  return {
    events:   firebase.database().ref('video-clip-events').child(uid),
    videos:   firebase.storage().ref('video-clips').child(uid),
    uploads:  firebase.storage().refFromURL('gs://vlogotron-uploads/video-clips').child(uid),
    uid:      uid
  };
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
function videoClipsForUid(uid) {
  const refs = refsForUid(uid);

  return Observable
      .fromEvent(refs.events.orderByKey(), 'value')
      .map(mapEventSnapshotToActiveClipIds)
      .scan(reduceClipIdsToPromises.bind(null, refs.videos), {exists: {}})
      .mergeMap((obj) => Observable.merge(...obj.promises))
      .scan((acc, obj) => Object.assign({}, acc, obj), {});
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


function subscribeToAudioPlayback(playCommands$, audioBuffers$, destinationNode) {
  const activeNodes = {};

  const subject = new Subject();

  playCommands$
    .withLatestFrom(audioBuffers$)
    .subscribe(([cmd, audioBuffers]) => {
      if (cmd.play && audioBuffers[cmd.play]) {
        const node = audioContext.createBufferSource();
        node.buffer = audioBuffers[cmd.play];
        node.connect(destinationNode);
        activeNodes[cmd.play] = node;
        node.start();
      }

      if (cmd.pause && activeNodes[cmd.pause]) {
        activeNodes[cmd.pause].stop();
      }

      subject.next(Object.assign({when: audioContext.currentTime}, cmd));
    });

  return subject.asObservable();
}