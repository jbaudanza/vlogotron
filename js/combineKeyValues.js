import { Observable } from 'rxjs/Observable';
import { identity, values } from 'lodash'

function combineKeyValues(observableFactory, keySelector=identity, resultSelector=identity) {
  return Observable.create((observer) => {
    const state = {};
    let lastInput = null;

    function handler(key, value) {
      state[key] = value;
      doNext();
    }

    function doNext() {
      observer.next(resultSelector(state, lastInput));
    }

    function accumulateSubscriptions(subscriptions, input) {
      const newSubscriptions = {};
      const keys = keySelector(input);

      // Add new subscriptions
      keys.forEach((key) => {
        if (key in subscriptions) {
          newSubscriptions[key] = subscriptions[key];
        } else {
          newSubscriptions[key] = observableFactory(key).subscribe(handler.bind(null, key));
        }
      });

      let stateChanged = false

      // Remove old subscriptions
      Object.keys(subscriptions).forEach(function(key) {
        if (!(key in newSubscriptions)) {
          subscriptions[keys].unsubscribe();
          delete state[key];
          stateChanged = true;
        }
      });

      if (stateChanged) {
        doNext();
      }

      return newSubscriptions;
    }

    let subscriptions = {};

    const subscription = this.subscribe({
      next(input) {
        lastInput = input;
        subscriptions = accumulateSubscriptions(subscriptions, input);
      },
      error(err) {
        observer.error(err);
        cleanup();
      },
      complete() {
        observer.complete();
        cleanup();
      }
    });

    function cleanup() {
      values(subscriptions).forEach((sub) => sub.unsubscribe())
      subscription.unsubscribe();
    }

    return cleanup();
  });
}

Observable.prototype.combineKeyValues = combineKeyValues;
