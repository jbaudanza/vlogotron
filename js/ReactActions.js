import { Subject } from "rxjs/Subject";

import { forEach, fromPairs, bindKey, mapValues } from "lodash";

function subjectName(actionName) {
  return actionName + "$";
}

function callbackName(actionName) {
  return "on" + actionName[0].toUpperCase() + actionName.substr(1);
}

export default class ReactActions {
  constructor(actionNames) {
    this.subjects = fromPairs(
      actionNames.map(name => [subjectName(name), new Subject()])
    );

    this.observables = mapValues(this.subjects, subject =>
      subject.asObservable()
    );

    this.callbacks = fromPairs(
      actionNames.map(name => [
        callbackName(name),
        bindKey(this.subjects[subjectName(name)], "next")
      ])
    );
  }

  completeAll() {
    forEach(this.actions, subject => subject.complete());
  }
}
