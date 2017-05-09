import { Observable } from "rxjs/Observable";
import { identity, values, isEmpty } from "lodash";

function combineKeyValues(
  observableFactory,
  keySelector = identity,
  resultSelector = identity
) {
  return Observable.create(observer => {
    const lastValues = {};
    let accSubscriptions = {};
    let lastInput = null;

    function handler(key, value) {
      lastValues[key] = value;
      doNext();
    }

    function doNext() {
      observer.next(resultSelector(lastValues, lastInput));
    }

    function accumulateSubscriptions(subscriptions, input) {
      const newSubscriptions = {};
      const keys = keySelector(input);

      if (keys.length === 0) {
        doNext();
        return newSubscriptions;
      }

      // Add new subscriptions
      keys.forEach(key => {
        if (key in subscriptions) {
          newSubscriptions[key] = subscriptions[key];
        } else {
          const observable = observableFactory(key);
          const subscription = observable.subscribe(handler.bind(null, key));
          newSubscriptions[key] = subscription;
        }
      });

      let stateChanged = false;

      // Remove old subscriptions
      Object.keys(subscriptions).forEach(function(key) {
        if (!(key in newSubscriptions)) {
          subscriptions[key].unsubscribe();
          delete subscriptions[key];
          delete lastValues[key];
          stateChanged = true;
        }
      });

      if (stateChanged) {
        doNext();
      }

      return newSubscriptions;
    }

    const sourceSubscription = this.subscribe({
      next(input) {
        lastInput = input;
        accSubscriptions = accumulateSubscriptions(accSubscriptions, input);
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
      values(accSubscriptions).forEach(sub => sub.unsubscribe());
      if (sourceSubscription) {
        sourceSubscription.unsubscribe();
      }
    }

    return cleanup;
  });
}

Observable.prototype.combineKeyValues = combineKeyValues;
