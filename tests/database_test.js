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
    t.is(mockdb.root.remixes[parentSongId][songId].title, 'Test song');
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
    t.is(mockdb.root.remixes[parentSongId][songId].title, 'New Title');
    t.is(mockdb.root.users[uid].songs[songId].title, 'New Title');
  })
});

test('deleteSong', t => {
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
    return database.deleteSong(mockdb, {...song, songId});
  }).then((songId) => {
    t.true('deletedAt' in mockdb.root.songs[songId]);
    t.false(songId in mockdb.root.remixes[parentSongId]);
    t.false(songId in mockdb.root.users[song.uid].songs);
  })
});
