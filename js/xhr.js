/* @flow */

import { Observable } from "rxjs/Observable";

export function httpOk(status: number): boolean {
  return status >= 200 && status <= 299;
}

export function postJSON(
  url: string,
  jwt: ?string,
  body: Object
): Observable<XMLHttpRequest> {
  return Observable.create(function(observer) {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url, true);

    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

    if (jwt) {
      xhr.setRequestHeader("Authorization", "Bearer " + jwt);
    }

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

export function getArrayBuffer(url: string): Promise<ArrayBuffer> {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.send(null);

  return new Promise((resolve, reject) => {
    xhr.onload = function(event) {
      resolve(xhr.response);
    };
    xhr.onerror = reject;
  });
}
