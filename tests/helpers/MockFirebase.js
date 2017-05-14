import {last} from 'lodash';

function splitPath(path) {
  return path.split('/');
}

function keyFromPath(path) {
  const parts = splitPath(path);
  if (parts.length === 0)
    return null;
  else
    return last(parts);
}

function walkToPath(iter, pathParts) {
  if (pathParts.length === 0) {
    throw "Invalid path";
  }

  if (pathParts.length === 1) {
    return iter;
  } else {
    const key = pathParts[0];
    if (key in iter) {
      if (typeof iter[key] !== 'object') {
        throw "Expected to find object at key: " + key;
      }
    } else {
      iter[key] = {};
    }

    return walkToPath(iter[key], pathParts.slice(1));
  }
}

export function createFirebaseKey() {
  let text = "-";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for(let i=0; i<19; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

class MockFirebaseReference {
  constructor(db, path) {
    this.path = path;
    this.db = db;
    this.key = keyFromPath(path);
  }

  child(path) {
    return new MockFirebaseReference(this.db, this.path + '/' + path); 
  }

  root() {
    return new MockFirebaseReference(this.db, '');
  }

  orderByKey() {
    return new MockQuery(this);
  }

  parent() {
    const parts = splitPath(this.path);
    if (parts.length === 0) {
      return null;
    } else {
      return new MockFirebaseReference(this.db, parts.slice(0,-1).join('/'))
    }
  }

  set(value) {
    //console.log('setting', this.key, value)
    const parts = splitPath(this.path);
    let key;
    let object;

    if (parts.length === 0) {
      key = 'root';
      object = this.db;
    } else {
      key = last(parts);
      object = walkToPath(this.db.root, parts);
    }

    object[key] = value;

    return Promise.resolve(this);
  }

  push(value) {
    return this.child(createFirebaseKey()).set(value);
  }
}

class MockQuery {
  constructor(ref) {
    this.ref = ref;
  }

  limitToFirst(limit) {
    return this;
  }

  limitToLast(limit) {
    return this;
  }

  on(eventType, callback, cancelCallbackOrContext, context) {
  }

  off(eventType, callback, context) {
  }
}

export class MockFirebaseDatabase {
  constructor() {
    this.root = {};
  }

  ref(path='') {
    return new MockFirebaseReference(this, path);
  }
}
