// Functions for updating the state of the song

export function storeEvent(songId, event) {
  songRef(songId).child("events").push(event);
}

export function changeTitle(songId, title) {
  if (!isBlank(title)) {
    const event = {
      title: title,
      type: "renamed",
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    storeEvent(songId, event);
    songRef(songId).child("title").set(title);
  }
}

function songRef(songId) {
  return firebase.database().ref("songs").child(songId);
}

function isBlank(string) {
  string == null || string.trim() === "";
}
