/*
October 10, 2017
  Migrating away from song schema to new songboard schema.
*/
const admin = require("firebase-admin");

const { last, values } = require("lodash");

var serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vlogotron-95daf.firebaseio.com"
});

const MIDI_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];

function labelToMidiNote(label) {
  const match = label.toUpperCase().match(/([\w#]+)([\-\d]+)/);
  if (match) {
    const note = match[1];
    const noteOffset = MIDI_NOTES.indexOf(note);
    if (noteOffset === -1) return null;

    const octave = parseInt(match[2]);

    return noteOffset + (octave + 1) * MIDI_NOTES.length;
  } else {
    return null;
  }
}

function convertToMidiNotes(notes) {
  return notes.map(([a,b,c]) => [labelToMidiNote(a), b, c])
}

const songBoardsRef = admin.database().ref('song-boards');

function migrateSongsToSongBoards() {
  return admin.database().ref('songs').once('value', (collection) => {
    let promises = [];

    collection.forEach((songSnapshot) => {
      const song = songSnapshot.val()
      const events = [];

      if (song.revisions) {
        const revision = last(values(song.revisions));

        if (revision == null) {
          console.log("Unable to find a revision");
          process.exit();
        }

        for (let noteLabel in revision.videoClips) {
          const midiValue = labelToMidiNote(noteLabel.replace("sharp", "#"));
          if (midiValue == null) {
            console.error("Unable to parse", noteLabel);
            process.exit();
          }

          const value = revision.videoClips[noteLabel];

          let videoClipId;
          let playbackParams = null;
          if (typeof value === "string") {
            videoClipId = value;
          } else {
            videoClipId = value.videoClipId;
            playbackParams = {
              gain: value.gain,
              trimStart: value.trimStart,
              trimEnd: value.trimEnd,
              playbackRate: 1
            };
          }

          events.push({
            timestamp: song.createdAt,
            type: "update-video-clip",
            videoClipId: videoClipId,
            note: midiValue,
            uid: song.uid
          });

          if (playbackParams) {
            events.push({
              timestamp: song.createdAt,
              type: "update-playback-params",
              playbackParams: playbackParams,
              note: midiValue,
              uid: song.uid
            });
          }
        }

        events.push({
          timestamp: song.createdAt,
          type: "update-song",
          songId: "custom",
          customSong: {
            title: revision.title,
            bpm: (revision.bpm || 120),
            notes: convertToMidiNotes(revision.notes || [])
          }
        });

        events.push({
          timestamp: song.createdAt,
          type: "update-title",
          title: revision.title
        });

        if (events.length > 0) {
          console.log("Migrating", songSnapshot.key);

          const songBoard = {
            createdAt: song.createdAt,
            updatedAt: song.updatedAt,
            uid: song.uid,
            visibility: revision.visibility || song.visibility,
            title: revision.title,
            events: events
          }

          promises.push(
            songBoardsRef.child(songSnapshot.key).set(songBoard)
          )
        }
      }
    })

    return Promise.all(promises);
  })
}

function titleForSongBoard(songBoard) {
  let title;

  if (songBoard.parentSongBoard) {
    title = "Remix of " + songBoard.parentSongBoard.title;
  } else {
    title = "Untitled Song";
  }

  return values(songBoard.events).reduce((acc, event) => {
    if (event.type === 'update-title')
      return event.title;
    else
      return acc;
  }, title);
}

function denormalizeSongBoards() {
  return songBoardsRef.once('value').then(collection => {
    const userMap = {};

    collection.forEach((snapshot) => {
      songBoard = snapshot.val();
      if (!userMap[songBoard.uid]) {
        userMap[songBoard.uid] = {};
      }

      userMap[songBoard.uid][snapshot.key] = {
        createdAt: songBoard.createdAt,
        updatedAt: songBoard.updatedAt || songBoard.createdAt,
        title: titleForSongBoard(songBoard),
        visibility: "everyone"
      }
    })

    const promises = [];
    for (uid in userMap) {
      console.log("Denormalizing for user", uid)
      promises.push(
        admin.database().ref("users").child(uid).child("song-boards").set(userMap[uid])
      )
    }
    return Promise.all(promises);
  })
}

migrateSongsToSongBoards()
denormalizeSongBoards()
  .then(() => {
    console.log("finished")
    process.exit()
  }, (err) => {
    console.error(err);
    process.exit(1)
  });