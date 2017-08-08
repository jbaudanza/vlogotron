/* @flow */

import { Observable } from "rxjs/Observable";
import { forEach } from "lodash";

type ObservableTemplate = { [string]: Observable<any> };

/*
  Like Observable.combineLatest, but works with a template Object for input.

  Use it like this:

  prop$ = combineTemplate({
    counter: counter$,
    errors: errors$
  });
*/
export default function combineTemplate(
  template: ObservableTemplate
): Observable<Object> {
  const keys = Object.keys(template);
  const observables: Array<Observable<any>> = keys.map(key => template[key]);

  function combinator() {
    const result = {};
    forEach(arguments, (value, index) => {
      result[keys[index]] = value;
    });
    return result;
  }

  // $FlowFixMe - combineLatest with a variable number of arguments
  return Observable.combineLatest(...observables, combinator);
}
