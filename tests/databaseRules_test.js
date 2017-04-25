import test from 'ava';
import fs from 'fs';

// This is the module that tests firebase rules. A WAY better name would be
// firebase-rules-tester, but they went with targaryen.
import targaryen from 'targaryen';

const rules = JSON.parse(fs.readFileSync('./database.rules.json'));

test('database.rules - updating a song', t => {
  const data = {
    songs: {
      '1': {
        uid: '1',
        title: 'old title'
      }
    }
  };
  const database = targaryen.database(rules, data);

  let result;

  // Anonymous CAN NOT update the song
  result = database.update('/songs/1/title', 'new title');
  t.false(result.allowed);

  // Different user CAN NOT update the song
  result = database.as({uid: '2'}).update('/songs/1/title', 'new title');
  t.false(result.allowed);

  // Owner CAN update the song
  result = database.as({uid: '1'}).update('/songs/1/title', 'new title');
  t.true(result.allowed);
});

test('database.rules - creating a new song', t => {
  const data = {
    songs: {}
  };
  const database = targaryen.database(rules, data);

  const song = {
    title: 'new title',
    uid: '1'
  };

  let result;

  // Anonymous CAN NOT add a new song
  result = database.write('/songs/1', song);
  t.false(result.allowed);

  // Authenticated user CAN add a new song
  result = database.as({uid: '1'}).write('/songs/1', song);
  t.true(result.allowed);

  // Authenticated user CAN NOT add a new song with another user's uid
  result = database.as({uid: '2'}).write('/songs/1', song);
  t.false(result.allowed);
});


test('database.rules - reading a song', t => {
  const data = {
    songs: {
      '1': {
        uid: '1',
        visibility: 'owner'
      },
      '2': {
        uid: '1',
        visibility: 'everyone'
      }
    }
  };
  const database = targaryen.database(rules, data);

  let result;

  // Anonymous CAN NOT read owner-only song
  result = database.read('/songs/1');
  t.false(result.allowed);

  // Owner user CAN read owner-only song
  result = database.as({uid: '1'}).read('/songs/1');
  t.true(result.allowed);

  // Non-owner user CAN NOT read owner-only song
  result = database.as({uid: '2'}).read('/songs/1');
  t.false(result.allowed);


  // Anonymous CAN read public song
  result = database.read('/songs/2');
  t.true(result.allowed);

  // Owner user CAN read public song
  result = database.as({uid: '1'}).read('/songs/2');
  t.true(result.allowed);

  // Non-Owner user CAN read public song
  result = database.as({uid: '2'}).read('/songs/2');
  t.true(result.allowed);
});