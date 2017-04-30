import test from 'ava';

import {Observable} from 'rxjs';

import '../js/combineKeyValues';

test('combineKeyValues', t => {
  const source$ = Observable.of(['hello', 'world']);


  function observableFactory(key) {
    return Observable.of(key.toUpperCase());
  }

  return source$.combineKeyValues(observableFactory).toPromise().then((result) => {
    t.deepEqual(result, {"hello": "HELLO", "world": "WORLD"});
  })
});