import { Observable } from "rxjs";

import { mapKeys, mapValues, omit } from "lodash";

import * as firebase from "firebase";

export function createSong(database, song) {
  const songsCollectionRef = database.ref("songs");

  const rootObject = {
    ...omit(song, 'notes'),
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    updatedAt: firebase.database.ServerValue.TIMESTAMP
  };

  if ("parentSong" in song) {
    rootObject.parentSong = song.parentSong;
  }

  return songsCollectionRef.push(rootObject).then(songRef => {
    songRef.child("revisions").push({
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      ...convertToFirebaseKeys(song)
    });

    denormalizedRefsForSong(database, {...song, songId: songRef.key}).forEach((ref) => {
      ref.set(rootObject);
    });

    return songRef.key;
  });
}

function denormalizedRefsForSong(database, song) {
  const refs = [];

  refs.push(
    database.ref("users").child(song.uid).child("songs").child(song.songId)
  );

  if (song.parentSong) {
    refs.push(
      database
        .ref("songs")
        .child(song.parentSong.songId)
        .child("remixes")
        .child(song.songId)
    );
  }

  return refs;
}

export function updateSong(database, song) {
  const songsCollectionRef = database.ref("songs");
  const rootRef = songsCollectionRef.child(song.songId);

  const denormalizedRef = database
    .ref("users")
    .child(song.uid)
    .child("songs")
    .child(song.songId);

  const refs = denormalizedRefsForSong(database, song);
  refs.concat(rootRef).forEach(ref => {
    ref.child("updatedAt").set(firebase.database.ServerValue.TIMESTAMP);
    ref.child("title").set(song.title);
  });

  const revision = convertToFirebaseKeys(omit(song, "createdAt", "updatedAt"));

  return rootRef.child("revisions").push(revision).then(ignore => rootRef.key);
}

export function updateUser(database, user) {
  const ref = database.ref("users").child(user.uid);
  ref.child("displayName").set(user.displayName);
  ref.child("email").set(user.displayName);
  ref.child("providerData").set(user.providerData);
  ref.child("lastSeenAt").set(firebase.database.ServerValue.TIMESTAMP);
}

export function songById(database, songId) {
  const ref = database
    .ref("songs")
    .child(songId)
    .child("revisions")
    .orderByKey()
    .limitToLast(1);

  return fromFirebaseRef(ref, "child_added")
    .map(snapshot => ({
      songId,
      revisionId: snapshot.key,
      ...snapshot.val()
    }))
    .map(convertFromFirebaseKeys)
    .map(fillInDefaults);
}

export function displayNameForUid(database, uid) {
  const ref = database.ref("users").child(uid).child("displayName");
  return fromFirebaseRef(ref, "value").map(snapshot => snapshot.val());
}

export function waitForTranscode(database, videoClipId) {
  return fromFirebaseRef(
    database.ref("video-clips").child(videoClipId).child("transcodedAt"),
    "value"
  )
    .takeWhile(snapshot => !snapshot.exists())
    .ignoreElements();
}

export function songsForUser(database, uid) {
  const ref = database.ref("users").child(uid).child("songs");
  return fromFirebaseRef(ref, "value").map(snapshot =>
    mapValues(snapshot.val(), (value, key) => ({ ...value, songId: key }))
  );
}

export function createVideoClip(database, databaseEntry, videoBlob) {
  const databaseRef = database.ref("video-clips");

  const uploadRef = firebase
    .storage()
    .refFromURL("gs://vlogotron-uploads/video-clips");

  const ref = databaseRef.push(databaseEntry);

  ref.then(() => uploadRef.child(ref.key).put(videoBlob));

  return ref.then(() => ref.key);
}

function fillInDefaults(song) {
  const clone = Object.assign({}, song);
  if (!("videoClips" in song)) {
    clone.videoClips = {};
  }
  if (!("notes" in song)) {
    clone.notes = [];
  }
  return clone;
}

function convertToFirebaseKeys(song) {
  return {
    ...song,
    videoClips: mapKeys(song.videoClips, (value, key) =>
      key.replace("#", "sharp")
    )
  };
}

function convertFromFirebaseKeys(song) {
  return {
    ...song,
    videoClips: mapKeys(song.videoClips, (value, key) =>
      key.replace("sharp", "#")
    )
  };
}

// It's tempting to use Observable.fromEvent, but firebase has a unique way to
// report errors, so we want to use something custom instead.
function fromFirebaseRef(ref, eventType) {
  return Observable.create(function(observer) {
    const handler = observer.next.bind(observer);

    ref.on(eventType, handler, observer.error.bind(observer));

    return () => ref.off(eventType, handler);
  });
}
