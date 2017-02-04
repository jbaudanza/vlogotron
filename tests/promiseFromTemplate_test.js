import test from 'ava';
import promiseFromTemplate from '../js/promiseFromTemplate';

function resolveLater(value) {
  return new Promise(function(resolve, reject) {
    setTimeout(() => resolve(value), 10);
  })
}

test('promiseFromTemplate - happy path', t => {
  t.plan(1);

  return promiseFromTemplate({
    string: "hello",
    foo: resolveLater('bar'),
    number: 123,
    listOfObjects: [{
      hello: resolveLater('world')
    }],
   list: [1,2,resolveLater(3)]
  }).then(function(result) {

    const expected = {
      foo: 'bar',
      string: "hello",
      number: 123,
      list: [1,2,3],
      listOfObjects: [{
        hello: 'world'
      }]
    };
    t.deepEqual(result, expected);
  });
});

test('promiseFromTemplate - empty', t => {
  t.plan(1);

  return promiseFromTemplate({})
    .then(v => { t.deepEqual(v, {}) });
});

test('promiseFromTemplate - errors', t => {
  t.plan(1);

  return promiseFromTemplate({
    nest1: {
      success: resolveLater('ok'),
    },
    nest2: [Promise.reject('oh no!')]
  }).catch(function(e) {
    t.is(e, 'oh no!');
  });
});
