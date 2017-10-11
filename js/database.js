/* @flow */
import { Observable } from "rxjs/Observable";

import { mapKeys, mapValues, omit } from "lodash";

import * as firebase from "firebase";

import { uniq } from "lodash";
import { postToAPI } from "./xhr";

import { songs } from "./song";

import { midiNoteToLabel, labelToMidiNote } from "./midi";
import type { Song, SongId } from "./song";
import type { PlaybackParams } from "./AudioPlaybackEngine";

type NoteId = number; // MIDI note number
export type VideoClipId = string; // Looks like firebase id

export type VideoClip = {
  videoClipId: string,
  playbackParams: PlaybackParams
};

export type SongBoardEvent =
  | {
      type: "update-video-clip",
      videoClipId: string,
      note: NoteId,
      uid?: string
    }
  | {
      type: "remove-video",
      note: NoteId,
      uid: string
    }
  | {
      type: "update-playback-params",
      playbackParams: PlaybackParams,
      note: NoteId,
      uid: string
    }
  | {
      type: "update-song",
      songId: SongId,
      customSong: ?Song,
      uid: string
    }
  | {
      type: "update-title",
      title: string,
      uid: string
    };

export type SongBoard = {
  uid: string,
  songBoardId: string,
  createdAt: number,
  updatedAt: number,
  songId: SongId,
  customSong: ?Song,
  title: string,
  visibility: string,
  videoClips: { [string]: VideoClip }
};

export type DenormalizedSongBoard = {
  title: string,
  createdAt: number,
  updatedAt: number,
  visibility: string
};

export function songForSongBoard(songBoard: SongBoard): Song {
  if (songBoard.customSong && songBoard.songId === "custom") {
    return songBoard.customSong;
  }

  if (songBoard.songId) {
    return songs[songBoard.songId];
  }

  return {
    title: "Untitled Song",
    bpm: 120,
    notes: [],
    premium: false
  };
}

export function createSongBoard(
  database: Firebase$Database,
  uid: string,
  parentSongBoard?: SongBoard
): Promise<string> {
  const collectionRef = database.ref("song-boards");

  const rootObject: Object = {
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    uid: uid,
    visibility: "everyone"
  };

  if (parentSongBoard) {
    rootObject.parentSongBoard = parentSongBoard;
  }

  const rootWrite = collectionRef.push(rootObject);

  return rootWrite
    .then(ref => ref.once("value")) // Read it back to get the timestamps
    .then(snapshot =>
      denormalizeSongBoard(
        database,
        uid,
        snapshot.key,
        songBoardSnapshot(snapshot)
      ).then(() => snapshot.key)
    );
}

export function updateSongBoard(
  database: Firebase$Database,
  songBoardId: string,
  event: SongBoardEvent
): Promise<string> {
  const promises = [];

  promises.push(
    database
      .ref("song-boards")
      .child(songBoardId)
      .child("events")
      .push({ timestamp: firebase.database.ServerValue.TIMESTAMP, ...event })
  );

  // TODO: We are pulling the uid off the event, when really we should be
  // pulling it off of the root songBoard object. It doesn't matter for now,
  // since this will be the same. But this will need to be updated when we start
  // allowing multiple users to collaborate on a songboard
  const denormalizedRef = database
    .ref("users")
    .child(event.uid)
    .child("song-boards")
    .child(songBoardId);
  promises.push(
    denormalizedRef
      .child("updatedAt")
      .set(firebase.database.ServerValue.TIMESTAMP)
  );

  if (event.type === "update-title") {
    promises.push(denormalizedRef.child("title").set(event.title));
  }

  return Promise.all(promises).then(() => songBoardId);
}

function denormalizeSongBoard(
  database: Firebase$Database,
  uid: string,
  songBoardId: string,
  denormalizedSongBoard: DenormalizedSongBoard
) {
  return database
    .ref("users")
    .child(uid)
    .child("song-boards")
    .child(songBoardId)
    .set(denormalizedSongBoard);
}

function updateVideoClip(
  songBoard: SongBoard,
  note: string,
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

const defaultPlaybackParams = {
  gain: 0.75,
  trimStart: 0,
  trimEnd: 1,
  playbackRate: 1
};

function normalizeToNoteLabel(maybeMidiNote: string | number): string {
  if (typeof maybeMidiNote === "number") {
    return midiNoteToLabel(maybeMidiNote);
  } else {
    return maybeMidiNote;
  }
}

function reduceSongBoard(acc: SongBoard, event: SongBoardEvent): SongBoard {
  switch (event.type) {
    case "add-video": // deprecated
    case "update-video-clip":
      let noteKey = normalizeToNoteLabel(event.note);

      const videoClip: VideoClip = {
        videoClipId: event.videoClipId,
        playbackParams: defaultPlaybackParams
      };

      return {
        ...acc,
        videoClips: {
          ...acc.videoClips,
          [noteKey]: videoClip
        }
      };
    case "remove-video":
      return {
        ...acc,
        videoClips: omit(acc.videoClips, normalizeToNoteLabel(event.note))
      };
    case "update-playback-params":
      const playbackParams = event.playbackParams;
      return updateVideoClip(
        acc,
        normalizeToNoteLabel(event.note),
        videoClip => ({
          ...videoClip,
          playbackParams
        })
      );

    case "update-song":
      return {
        ...acc,
        songId: event.songId,
        customSong: normalizeSong(event.customSong)
      };

    case "update-title":
      return { ...acc, title: event.title };
  }

  return acc;
}

function normalizeSong(input: ?Object) {
  if (input && Array.isArray(input.notes)) {
    return input;
  } else {
    return { ...input, notes: [] };
  }
}

function songBoardSnapshot(snapshot): SongBoard {
  const val = snapshot.val();
  let obj;

  if (val.parentSongBoard) {
    obj = {
      title: "Remix of " + val.parentSongBoard.title,
      videoClips: val.parentSongBoard.videoClips,
      songId: val.parentSongBoard.songId,
      customSong: val.parentSongBoard.customSong
    };
  } else {
    obj = {
      title: "Untitled Song",
      videoClips: {}
    };
  }

  return {
    songBoardId: snapshot.key,
    createdAt: val.createdAt,
    updatedAt: val.updatedAt || null,
    visibility: val.visibility,
    uid: val.uid,
    ...obj
  };
}

export function findSongBoard(
  database: Firebase$Database,
  songBoardId: string
): Observable<SongBoard> {
  const songBoardRef = database.ref("song-boards").child(songBoardId);

  const first$ = fromFirebaseRef(songBoardRef, "value")
    .map(snapshot => songBoardSnapshot(snapshot))
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

export function deleteSongBoard(
  database: Firebase$Database,
  uid: string,
  songBoardId: string
) {
  const rootRef = database.ref("song-boards").child(songBoardId);

  return Promise.all([
    rootRef.child("deletedAt").set(firebase.database.ServerValue.TIMESTAMP),
    database
      .ref("users")
      .child(uid)
      .child("song-boards")
      .child(songBoardId)
      .remove()
  ]);
}

export function updateUser(database: Firebase$Database, user: Firebase$User) {
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

export function displayNameForUid(
  database: Firebase$Database,
  uid: string
): Observable<string> {
  const ref = database.ref("users").child(uid).child("displayName");
  return fromFirebaseRef(ref, "value").map(snapshot => snapshot.val());
}

export function photoURLForUid(
  database: Firebase$Database,
  uid: string
): Observable<?string> {
  const ref = database.ref("users").child(uid).child("photoURL");
  return fromFirebaseRef(ref, "value").map(snapshot => snapshot.val());
}

export function waitForTranscode(
  database: Firebase$Database,
  videoClipId: string
): Observable<Object> {
  return fromFirebaseRef(
    database.ref("video-clips").child(videoClipId).child("transcodedAt"),
    "value"
  )
    .takeWhile(snapshot => !snapshot.exists())
    .ignoreElements();
}

export function songBoardsForUser(
  database: Firebase$Database,
  uid: string
): Observable<Object> {
  const ref = database.ref("users").child(uid).child("song-boards");
  return fromFirebaseRef(ref, "value").map(snapshot =>
    mapValues(snapshot.val(), (value, key) => ({ ...value, songId: key, uid }))
  );
}

export function videoClipsForSongBoard(
  database: Firebase$Database,
  songBoardId: string
): Observable<Array<string>> {
  // Note: Perhaps there is now a different between add-video and "select-video"
  const eventsRef = database
    .ref("song-boards")
    .child(songBoardId)
    .child("events");

  return reduceFirebaseCollection(eventsRef, reduceVideoClipList, []).map(uniq);
}

function reduceVideoClipList(acc, event) {
  if (event.type === "add-video" || event.type === "update-video-clip") {
    return acc.concat(event.videoClipId);
  } else {
    return acc;
  }
}

export function createVideoClip(
  jwt: ?string,
  databaseEntry: Object,
  videoBlob: Blob
): Promise<string> {
  const promise: Promise<{ key: string }> = postToAPI(
    "videoClips",
    jwt,
    databaseEntry
  ).toPromise();

  if (videoBlob.size === 0) {
    return Promise.reject("Invalid video");
  }

  const uploadRef = firebase
    .storage()
    .refFromURL("gs://vlogotron-uploads/video-clips");

  return promise.then(response => {
    uploadRef.child(response.key).put(videoBlob);
    return response.key;
  });
}

export function premiumAccountStatus(database: Firebase$Database, uid: string) {
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
