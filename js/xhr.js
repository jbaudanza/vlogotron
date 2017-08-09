/* @flow */

import { Observable } from "rxjs/Observable";

export function httpOk(status: number): boolean {
  return status >= 200 && status <= 299;
}

export function postJSON(url: string, jwt: string, body: Object) {
  return Observable.create(function(observer) {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url, true);

    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader("Authorization", "Bearer " + jwt);

    xhr.onload = () => {
      observer.next(xhr);
      observer.complete();
    };
    xhr.onerror = error => {
      observer.error(error);
    };

    xhr.send(JSON.stringify(body));

    return () => {
      xhr.abort();
    };
  });
}
