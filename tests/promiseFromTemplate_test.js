import test from 'ava';
import promiseFromTemplate from '../js/promiseFromTemplate';

test('promiseFromTemplate - happy path', t => {
  t.plan(1);

  return promiseFromTemplate({
    foo: Promise.resolve('bar'),
    string: "hello",
    number: 123,
    list: [1,2,Promise.resolve(3)]
  }).then(function(result) {

    const expected = {
      foo: 'bar',
      string: "hello",
      number: 123,
      list: [1,2,3]
    };
    t.deepEqual(result, expected);
  });
});

test('promiseFromTemplate - errors', t => {
  t.plan(1);

  return promiseFromTemplate({
    nest1: {
      success: Promise.resolve('ok'),
    },
    nest2: [Promise.reject('oh no!')]
  }).catch(function(e) {
    t.is(e, 'oh no!');
  });
});
