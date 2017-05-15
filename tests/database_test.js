import test from 'ava';
import fs from 'fs';

import targaryen from 'targaryen';
const rules = JSON.parse(fs.readFileSync('./database.rules.json'));

import * as database from '../js/database';
import {last} from 'lodash';

import {MockFirebaseDatabase, createFirebaseKey} from './helpers/MockFirebase';

test('createSong', t => {
  const mockdb = new MockFirebaseDatabase();

  const uid = createFirebaseKey();
  const parentSongId = createFirebaseKey();

  const song = {
    title: 'Test song',
    notes: [],
    uid: uid,
    parentSong: {songId: parentSongId}
  };

  t.plan(3);

  return database.createSong(mockdb, song).then((songId) => {
    t.is(mockdb.root.songs[songId].title, 'Test song');
    t.is(mockdb.root.songs[parentSongId].remixes[songId].title, 'Test song');
    t.is(mockdb.root.users[uid].songs[songId].title, 'Test song');
  })
});

test('updateSong', t => {
  const mockdb = new MockFirebaseDatabase();

  const uid = createFirebaseKey();
  const parentSongId = createFirebaseKey();

  const song = {
    title: 'Test song',
    notes: [],
    uid: uid,
    parentSong: {songId: parentSongId}
  };

  t.plan(3);

  return database.createSong(mockdb, song).then((songId) => {
    const updatedSong = {...song, title: 'New Title'};

    return database.updateSong(mockdb, updatedSong);
  }).then((songId) => {
    t.is(mockdb.root.songs[songId].title, 'New Title');
    t.is(mockdb.root.songs[parentSongId].remixes[songId].title, 'New Title');
    t.is(mockdb.root.users[uid].songs[songId].title, 'New Title');
  })
});