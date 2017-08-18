/* @flow */
import { Observable } from "rxjs/Observable";

import { mapKeys, mapValues, omit } from "lodash";

import type { Song, SongId } from "./song";
import * as firebase from "firebase";

type VideoClipSource = $Exact<{
  src: string,
  type: string
}>;

type NoteId = string; // Looks like: "C#4"
type VideoClipId = string; // Looks like firebase id

export type VideoClip = {
  videoClipId: string,
  trimStart: number,
  trimEnd: number,
  gain: number
};

type VideoClipSources = {
  posterUrl: string,
  audioUrl: string,
  videoUrls: Array<VideoClipSource>
};

type SerializedSong = Song & {
  parentSong: ?SerializedSong,
  songId: SongId,
  videoClips: { [NoteId]: VideoClip },
  revisionId: string
};

export type SongBoardEvent =
  | {
      type: "add-video",
      videoClipId: string,
      note: NoteId,
      uid: string
    }
  | {
      type: "remove-video",
      note: NoteId,
      uid: string
    }
  | {
      type: "update-gain",
      value: number,
      note: NoteId,
      uid: string
    }
  | {
      type: "update-trim",
      note: NoteId,
      trimStart: number,
      trimEnd: number,
      uid: string
    }
  | {
      type: "update-song",
      songId: SongId,
      uid: string
    };

export type SongBoard = {
  uid: string,
  songBoardId: string,
  createdAt: number,
  updatedAt: number,
  songId: SongId,
  videoClips: { [NoteId]: VideoClip }
};

export type FirebaseDatabase = Object;

export function createSongBoard(
  database: FirebaseDatabase,
  uid: string,
  songId: string
): Promise<string> {
  const collectionRef = database.ref("song-boards");

  const rootObject = {
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    uid: uid,
    songId: songId
  };

  const rootWrite = collectionRef.push(rootObject);

  return rootWrite.then(songBoardRef => {
    return database
      .ref("users")
      .child(uid)
      .child("song-boards")
      .child(songBoardRef.key)
      .set(rootObject)
      .then(() => {
        return songBoardRef.key;
      });
  });
}

function updateVideoClip(
  songBoard: SongBoard,
  note: NoteId,
  fn: VideoClip => VideoClip
): SongBoard {
  if (note in songBoard.videoClips) {
    const videoClips = {
      ...songBoard.videoClips,
      [note]: fn(songBoard.videoClips[note])
    };
    return { ...songBoard, videoClips };
  } else {
    console.warn(`Attempt to update missing video-clip ${note}`);
    return songBoard;
  }
}

function reduceSongBoard(acc: SongBoard, event: SongBoardEvent): SongBoard {
  switch (event.type) {
    case "add-video":
      const videoClip: VideoClip = {
        videoClipId: event.videoClipId,
        gain: 0,
        trimStart: 0,
        trimEnd: 1
      };

      return {
        ...acc,
        videoClips: {
          ...acc.videoClips,
          [event.note]: videoClip
        }
      };
    case "remove-video":
      return { ...acc, videoClips: omit(acc.videoClips, event.note) };
    case "update-gain":
      const value = event.value;
      return updateVideoClip(acc, event.note, videoClip => ({
        ...videoClip,
        gain: value
      }));

    case "update-trim":
      const { trimStart, trimEnd } = event;
      return updateVideoClip(acc, event.note, videoClip => ({
        ...videoClip,
        trimStart,
        trimEnd
      }));

    case "update-song":
      return { ...acc, songId: event.songId };
  }

  return acc;
}

function songBoardSnapshot(snapshot): SongBoard {
  const val = snapshot.val();
  return {
    songBoardId: snapshot.key,
    createdAt: val.createdAt,
    updatedAt: val.updatedAt,
    songId: val.songId,
    uid: val.uid,
    videoClips: {}
  };
}

export function findSongBoard(
  database: FirebaseDatabase,
  songBoardId: string
): Observable<SongBoard> {
  const songBoardRef = database.ref("song-boards").child(songBoardId);

  const first$ = fromFirebaseRef(songBoardRef, "value")
    .map(songBoardSnapshot)
    .first();

  return first$.switchMap(initialSnapshot => {
    const eventsRef = songBoardRef.child("events");
    return reduceFirebaseCollection(
      eventsRef,
      reduceSongBoard,
      initialSnapshot
    );
  });
}

export function updateSongBoard(
  database: FirebaseDatabase,
  songId: string,
  event: SongBoardEvent
): Promise<Object> {
  return database
    .ref("song-boards")
    .child(songId)
    .child("events")
    .push({ timestamp: firebase.database.ServerValue.TIMESTAMP, ...event });
}

export function createSong(
  database: FirebaseDatabase,
  song: SerializedSong
): Promise<string> {
  const songsCollectionRef = database.ref("songs");

  const rootObject = {
    ...omit(song, "notes"),
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

    denormalizedRefsForSong(database, {
      ...song,
      songId: songRef.key
    }).forEach(ref => {
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

  const parentSong = song.parentSong;
  if (parentSong) {
    refs.push(
      database.ref("remixes").child(parentSong.songId).child(song.songId)
    );
  }

  return refs;
}

export function updateSong(database: FirebaseDatabase, song: Object) {
  const rootRef = database.ref("songs").child(song.songId);

  const refs = denormalizedRefsForSong(database, song);
  refs.concat(rootRef).forEach(ref => {
    ref.child("updatedAt").set(firebase.database.ServerValue.TIMESTAMP);
    ref.child("title").set(song.title);
  });

  const revision = convertToFirebaseKeys(omit(song, "createdAt", "updatedAt"));

  return rootRef.child("revisions").push(revision).then(ignore => rootRef.key);
}

export function deleteSong(database: FirebaseDatabase, song: Object) {
  const rootRef = database.ref("songs").child(song.songId);
  rootRef.child("deletedAt").set(firebase.database.ServerValue.TIMESTAMP);

  return Promise.all(
    denormalizedRefsForSong(database, song).map(ref => ref.remove())
  ).then(() => song.songId);
}

type FirebaseUserInfo = {
  photoURL: ?string,
  email: ?string,
  displayName: ?string,
  uid: string,
  providerId: string
};

export type FirebaseUser = {
  photoURL: ?string,
  email: ?string,
  displayName: ?string,
  uid: string,
  providerData: Array<FirebaseUserInfo>,
  getToken(): Promise<string>
};

export function updateUser(database: FirebaseDatabase, user: FirebaseUser) {
  const ref = database.ref("users").child(user.uid);
  ref.child("displayName").set(user.displayName);
  ref.child("email").set(user.email);
  ref.child("providerData").set(user.providerData);
  ref.child("lastSeenAt").set(firebase.database.ServerValue.TIMESTAMP);

  // user.photoURL seems to be producing expired URLs
  if (user.providerData.length > 0) {
    ref.child("photoURL").set(user.providerData[0].photoURL);
  }
}

export function songById(
  database: FirebaseDatabase,
  songId: string
): Observable<SerializedSong> {
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

export function displayNameForUid(
  database: FirebaseDatabase,
  uid: string
): Observable<string> {
  const ref = database.ref("users").child(uid).child("displayName");
  return fromFirebaseRef(ref, "value").map(snapshot => snapshot.val());
}

export function photoURLForUid(
  database: FirebaseDatabase,
  uid: string
): Observable<?string> {
  const ref = database.ref("users").child(uid).child("photoURL");
  return fromFirebaseRef(ref, "value").map(snapshot => snapshot.val());
}

export function waitForTranscode(
  database: FirebaseDatabase,
  videoClipId: string
): Observable<Object> {
  return fromFirebaseRef(
    database.ref("video-clips").child(videoClipId).child("transcodedAt"),
    "value"
  )
    .takeWhile(snapshot => !snapshot.exists())
    .ignoreElements();
}

export function songsForUser(
  database: FirebaseDatabase,
  uid: string
): Observable<Object> {
  const ref = database.ref("users").child(uid).child("songs");
  return fromFirebaseRef(ref, "value").map(snapshot =>
    mapValues(snapshot.val(), (value, key) => ({ ...value, songId: key, uid }))
  );
}

export function createVideoClip(
  database: FirebaseDatabase,
  databaseEntry: Object,
  videoBlob: Object
): Promise<string> {
  const databaseRef = database.ref("video-clips");

  const uploadRef = firebase
    .storage()
    .refFromURL("gs://vlogotron-uploads/video-clips");

  const ref = databaseRef.push(databaseEntry);

  ref.then(() => uploadRef.child(ref.key).put(videoBlob));

  // This OR is just to make flow happy. It might not be necessary with better
  // flow-typed defs for firebase.
  return ref.then(() => ref.key || "");
}

export function premiumAccountStatus(database: FirebaseDatabase, uid: string) {
  const ref = database.ref("stripe-customers").child(uid).child("premium");
  return fromFirebaseRef(ref, "value").map(snapshot => snapshot.val());
}

function migrate(v) {
  if (typeof v === "string") {
    return {
      videoClipId: v,
      trimStart: 0,
      trimEnd: 1,
      gain: 1
    };
  } else {
    return v;
  }
}

function fillInDefaults(song) {
  const clone = Object.assign({}, song);
  if (!("videoClips" in song)) {
    clone.videoClips = {};
  }
  if (!("notes" in song)) {
    clone.notes = [];
  }

  clone.videoClips = mapValues(clone.videoClips, migrate);

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

function reduceFirebaseCollection<T>(
  collectionRef,
  accFn: (T, any) => T,
  initial: T
): Observable<T> {
  const query = collectionRef.orderByKey();

  return fromFirebaseRef(query, "value").first().switchMap(snapshot => {
    let lastKey;
    let acc = initial;

    snapshot.forEach(function(child) {
      lastKey = child.key;
      acc = accFn(acc, child.val());
    });

    let rest$;
    if (lastKey) {
      rest$ = fromFirebaseRef(query.startAt(lastKey), "child_added").skip(1);
    } else {
      rest$ = fromFirebaseRef(query, "child_added");
    }

    const stream$ = rest$.map(snapshot => snapshot.val()).scan(accFn, acc);
    return stream$.startWith(acc);
  });
}
