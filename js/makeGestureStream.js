/* @flow */

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { bindAll, forEach, identity, find } from "lodash";

type TouchGestureBegin = {
  firstEl: Element,
  clientX: number,
  clientY: number,
  movements$: Observable<TouchGestureMovement>
};

type TouchGestureMovement = {
  element: ?Element,
  clientX: number,
  clientY: number
};

const documentMouseMove$ = Observable.fromEvent(document, "mousemove");
const documentMouseUp$ = Observable.fromEvent(document, "mouseup");

function makeMouseGestures(
  element: HTMLElement
): Observable<TouchGestureBegin> {
  const mouseDown$ = Observable.fromEvent(element, "mousedown");

  return mouseDown$
    .map((event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) return null;

      // Don't activate on right clicks or control-left clicks
      if (event.button !== 0 || event.ctrlKey) return null;

      // TODO: Reproduce this somewhere else downstream
      // Make sure we don't trap an event that was supposed to go to a link
      // const link = findWrappingLink(target);
      // if (link && link !== el) return;

      const stream$ = documentMouseMove$
        .map(event => ({
          clientX: event.clientX,
          clientY: event.clientY,
          element: event.target
        }))
        .takeUntil(documentMouseUp$);

      event.preventDefault();
      event.stopPropagation();

      return {
        firstEl: target,
        clientX: event.clientX,
        clientY: event.clientY,
        movements$: stream$
      };
    })
    .nonNull();
}

function makeTouchGestures(element): Observable<TouchGestureBegin> {
  const touchStart$ = Observable.fromEvent(element, "touchstart");
  const touchMove$ = Observable.fromEvent(element, "touchmove");

  const end$ = Observable.merge(
    Observable.fromEvent(element, "touchend"),
    Observable.fromEvent(element, "touchcancel")
  );

  return touchStart$.flatMap(event => {
    const gestures = forEach(event.changedTouches, touch => {
      const identifier = touch.identifier;

      const stream$ = touchMove$
        .map(e => find(e.changedTouches, t => t.identifier === identifier))
        .filter(identity)
        .map(t => ({
          clientX: t.clientX,
          clientY: t.clientY,
          element: document.elementFromPoint(t.clientX, t.clientY) // TODO: This might not work http://stackoverflow.com/a/33464547/667069
        }))
        .takeUntil(end$);

      return {
        firstEl: touch.target,
        clientX: touch.clientX,
        clientY: touch.clientY,
        movements$: stream$
      };
    });

    if (gestures.length > 0) {
      event.preventDefault();
      event.stopPropagation();
    }

    return gestures;
  });
}

export default function makeGestureStream(
  element: HTMLElement
): Observable<TouchGestureBegin> {
  return Observable.merge(
    makeTouchGestures(element),
    makeMouseGestures(element)
  );
}
