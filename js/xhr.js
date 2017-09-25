/* @flow */

import { Observable } from "rxjs/Observable";

export function httpOk(status: number): boolean {
  return status >= 200 && status <= 299;
}

function createXhrObservable(
  configure: XMLHttpRequest => void
): Observable<XMLHttpRequest> {
  return Observable.create(function(observer) {
    const xhr = new XMLHttpRequest();
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

    configure(xhr);

    xhr.onload = () => {
      observer.next(xhr);
      observer.complete();
    };
    xhr.onerror = error => {
      observer.error(error);
    };

    return () => {
      xhr.abort();
    };
  });
}

export function postJSON(
  url: string,
  jwt: ?string,
  body: Object
): Observable<XMLHttpRequest> {
  return createXhrObservable(function(xhr) {
    xhr.open("POST", url, true);

    xhr.setRequestHeader("Content-type", "application/json");

    if (jwt) {
      xhr.setRequestHeader("Authorization", "Bearer " + jwt);
    }

    xhr.send(JSON.stringify(body));
  });
}

export function postToAPI(endpoint: string, jwt: ?string, requestBody: Object) {
  return postJSON(
    "https://us-central1-vlogotron-95daf.cloudfunctions.net/" + endpoint,
    jwt,
    requestBody
  )
    .do(xhr => {
      if (!httpOk(xhr.status)) {
        throw JSON.parse(xhr.responseText);
      }
    })
    .map(xhr => JSON.parse(xhr.responseText));
}

export function getArrayBuffer(url: string): Observable<ArrayBuffer> {
  return createXhrObservable(xhr => {
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
  }).map(xhr => xhr.response);
}
