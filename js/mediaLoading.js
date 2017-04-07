import {Observable} from 'rxjs/Observable';

import audioContext from './audioContext';

import {getArrayBuffer} from './http';

import {
  pickBy, includes, clone, omit, forEach, values, pick, sum, mapValues, identity
} from 'lodash';

import promiseFromTemplate from './promiseFromTemplate';


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
export function videoClipsForUid(uid) {
  const eventsRef = firebase.database().ref('video-clip-events').child(uid);
  const videosRef = firebase.storage().ref('video-clips').child(uid);

  return Observable
      .fromEvent(eventsRef.orderByKey(), 'value')
      .map(mapEventSnapshotToActiveClipIds)
      .scan(reduceClipIdsToPromises.bind(null, videosRef), {exists: {}})
      .mergeMap((obj) => Observable.merge(...obj.promises))
      .scan((acc, obj) => Object.assign({}, acc, obj), {});
}

export function loadAudioBuffersFromVideoClips(videoClips$, subscription) {
  const loadingContext$ = videoClips$
    .map(o => mapValues(o, v => v.audioUrl)) // { [note]: [url], ... }
    .scan(reduceToAudioBuffers, {});

  // Looks like { [note]: [audioBuffer], ... }
  const audioBuffers$ = loadingContext$
    .mergeMap(obj => Observable.merge(...obj.promises))
    .scan((acc, obj) => Object.assign({}, acc, obj), {})
    .publishReplay();

  const http$ = loadingContext$
    .flatMap(c => (
      Observable.from(values(pick(c.httpMap, c.newUrls)))
    ));

  const loading$ = http$
      .flatMap((http) => Observable.of(+1).concat(http.response.then(r => -1)))
      .scan((i, j) => i + j, 0)
      .map((count) => count > 0)
      .startWith(true);

  subscription.add(audioBuffers$.connect());

  return {loading$, audioBuffers$};
}

const formats = ['webm', 'mp4', 'ogv'];


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
  let acc = {
    uploadedNotes: {},
    transcodedClips: []
  };

  // simulate a reduce() call because firebase doesn't have one.
  snapshot.forEach(function(child) {
    const event = child.val();
    acc = reduceEventsToVideoClipState(acc, event)
  });

  return pickBy(acc.uploadedNotes, (v) => includes(acc.transcodedClips, v));
}

function reduceEventsToVideoClipState(acc, event) {
  let note = event.note;

  // All new notes should have an octave. Some legacy ones don't
  if (event.note && !note.match(/\d$/)) {
    note += '4';
  }

  if (event.type === 'uploaded') {
    const uploadedNotes = Object.assign({}, acc.uploadedNotes, {[note]: event.clipId});
    return Object.assign({}, acc, {uploadedNotes});
  }

  if (event.type === 'cleared') {
    const uploadedNotes = omit(acc.uploadedNotes, note);
    return Object.assign({}, acc, {uploadedNotes});
  }

  if (event.type === 'transcoded') {
    return Object.assign({}, acc, {transcodedClips: acc.transcodedClips.concat(event.clipId)});
  }

  return acc;
}


function decodeAudioData(arraybuffer) {
  // Safari doesn't support the Promise syntax for decodeAudioData, so we need
  // to make the promise ourselves.
  return new Promise(audioContext.decodeAudioData.bind(audioContext, arraybuffer));
}

export function getAudioBuffer(url) {
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
