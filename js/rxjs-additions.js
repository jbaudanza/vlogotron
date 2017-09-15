/**
  This file specifies which RxJs operators we actually use. This keeps our
  client bundle size down.

  Keep this list alphabetized for sanity. Hint: F5 in Sublime Text
*/
import "rxjs/add/operator/catch";
import "rxjs/add/operator/concat";
import "rxjs/add/operator/concatAll";
import "rxjs/add/operator/delay";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/do";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/first";
import "rxjs/add/operator/ignoreElements";
import "rxjs/add/operator/isEmpty";
import "rxjs/add/operator/last";
import "rxjs/add/operator/map";
import "rxjs/add/operator/mapTo";
import "rxjs/add/operator/mergeAll";
import "rxjs/add/operator/mergeMap";
import "rxjs/add/operator/mergeScan";
import "rxjs/add/operator/partition";
import "rxjs/add/operator/publish";
import "rxjs/add/operator/publishReplay";
import "rxjs/add/operator/reduce";
import "rxjs/add/operator/repeat";
import "rxjs/add/operator/retryWhen";
import "rxjs/add/operator/scan";
import "rxjs/add/operator/share";
import "rxjs/add/operator/skip";
import "rxjs/add/operator/startWith";
import "rxjs/add/operator/switch";
import "rxjs/add/operator/switchMap";
import "rxjs/add/operator/take";
import "rxjs/add/operator/takeUntil";
import "rxjs/add/operator/takeWhile";
import "rxjs/add/operator/toArray";
import "rxjs/add/operator/toPromise";
import "rxjs/add/operator/withLatestFrom";

import "rxjs/add/observable/combineLatest";
import "rxjs/add/observable/concat";
import "rxjs/add/observable/defer";
import "rxjs/add/observable/dom/ajax";
import "rxjs/add/observable/empty";
import "rxjs/add/observable/forkJoin";
import "rxjs/add/observable/from";
import "rxjs/add/observable/fromEvent";
import "rxjs/add/observable/fromPromise";
import "rxjs/add/observable/interval";
import "rxjs/add/observable/merge";
import "rxjs/add/observable/never";
import "rxjs/add/observable/of";
import "rxjs/add/observable/race";
import "rxjs/add/observable/timer";
import "rxjs/add/observable/using";

import "./combineKeyValues";

import { Observable } from "rxjs/Observable";

Observable.prototype.debug = function(message) {
  return this.do(
    next => {
      console.log(message, next);
    },
    err => {
      console.error(message, err);
    },
    () => {
      console.info(message, "completed");
    }
  );
};

Observable.prototype.concatWith = function(value) {
  return this.concat(Observable.of(value));
};

Observable.prototype.nonNull = function() {
  return this.filter(v => v != null);
};
