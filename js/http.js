import { Observable } from "rxjs/Observable";

export function getArrayBuffer(url) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";

  const response = new Promise((resolve, reject) => {
    xhr.onload = function(event) {
      resolve(xhr.response);
    };
    xhr.onerror = reject;
  });

  const contentLengthFromResponse = response.then(ab => ab.byteLength);

  function getContentLength() {
    const header = xhr.getResponseHeader("Content-Length");
    if (header != null) {
      return parseInt(header);
    } else {
      return null;
    }
  }

  const contentLength = Observable.fromEvent(xhr, "readystatechange")
    .takeWhile(e => e.target.readyState < 2) // 2 = XMLHttpRequest.HEADERS_RECEIVED
    .toPromise()
    .then(getContentLength);

  const progress = Observable.fromEvent(xhr, "progress").takeUntil(response);

  const loaded = Observable.merge(
    progress.filter(e => e.lengthComputable).map(e => e.loaded),
    contentLengthFromResponse
  );

  xhr.send(null);

  return { progress, response, contentLength, loaded };
}
