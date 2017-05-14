import test from 'ava';
import fs from 'fs';

import targaryen from 'targaryen';
const rules = JSON.parse(fs.readFileSync('./database.rules.json'));

import * as database from '../js/database';
import {last} from 'lodash';

import {MockFirebaseDatabase, createFirebaseKey} from './helpers/MockFirebase';

test.only('createSong', t => {
  const mockdb = new MockFirebaseDatabase();

  const song = {
    title: 'Test song',
    notes: []
  };

  const uid = createFirebaseKey();

  t.plan(1);

  return database.createSong(mockdb, song, 'user-id-abcdefg').then((songId) => {

    database.songById(mockdb, songId).subscribe(song => {
      console.log(song)
    });
    t.pass();
  })
});
