/* @flow */

import * as React from "react";

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { bindAll, forEach, identity, find } from "lodash";

import { findWrappingLink, findWrappingClass } from "./domutils";

const documentMouseMove$ = Observable.fromEvent(document, "mousemove");
const documentMouseUp$ = Observable.fromEvent(document, "mouseup");

export type TouchGestureBegin = {
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

type Props = {
  onTouchStart?: Function,
  onClick?: MouseEvent => void,
  className?: string,
  style?: Object,
  children: React.Node,
  enabled: boolean
};

export default class TouchableArea extends React.Component<Props> {
  touches$$: Subject<TouchGestureBegin>;
  touchCancel$: Observable<TouchEvent>;
  touchMove$: Observable<TouchEvent>;
  touchEnd$: Observable<TouchEvent>;
  rootElement: ?Element;

  constructor() {
    super();
    bindAll(this, "onMouseDown", "setRootElement", "onTouchStart");
    this.touches$$ = new Subject();
  }

  componentWillUnmount() {
    this.touches$$.complete();
  }

  start(
    firstEl: Element,
    clientX: number,
    clientY: number,
    movements$: Observable<TouchGestureMovement>
  ) {
    if (this.props.onTouchStart) {
      const cb = this.props.onTouchStart;
      cb(movements$);
    }

    this.touches$$.next({
      firstEl: firstEl,
      clientX: clientX,
      clientY: clientY,
      movements$: movements$
    });
  }

  onMouseDown(event: MouseEvent) {
    if (!this.props.enabled) return;

    const target = event.target;

    if (!(target instanceof Element)) return;

    const el = this.findTouchableElement(target);

    // Don't activate on right clicks or control-left clicks
    if (event.button !== 0 || event.ctrlKey) return;

    // Make sure we don't trap an event that was supposed to go to a link
    const link = findWrappingLink(target);
    if (link && link !== el) return;

    if (el) {
      const stream$ = documentMouseMove$
        .map(event => ({
          clientX: event.clientX,
          clientY: event.clientY,
          element: this.findTouchableElement(event.target)
        }))
        .takeUntil(documentMouseUp$);

      this.start(el, event.clientX, event.clientY, stream$);

      event.preventDefault();
      event.stopPropagation();
    }
  }

  setRootElement(node: ?Element) {
    this.rootElement = node;

    this.touchMove$ = Observable.fromEvent(this.rootElement, "touchmove");
    this.touchEnd$ = Observable.fromEvent(this.rootElement, "touchend");
    this.touchCancel$ = Observable.fromEvent(this.rootElement, "touchcancel");
  }

  onTouchStart(event: TouchEvent) {
    if (!this.props.enabled) return;

    let anyHandled = false;

    forEach(event.changedTouches, touch => {
      const el = this.findTouchableElement(touch.target);

      if (el) {
        const identifier = touch.identifier;

        anyHandled = true;

        function filterTouches(stream$) {
          return stream$
            .map(e => find(e.changedTouches, t => t.identifier === identifier))
            .filter(identity);
        }

        const end$ = Observable.merge(
          filterTouches(this.touchEnd$),
          filterTouches(this.touchCancel$)
        );

        const stream$ = filterTouches(this.touchMove$)
          .map(t => ({
            clientX: t.clientX,
            clientY: t.clientY,
            element: this.findTouchableElement(
              // TODO: This might not work http://stackoverflow.com/a/33464547/667069
              document.elementFromPoint(t.clientX, t.clientY)
            )
          }))
          .takeUntil(end$);

        this.start(el, touch.clientX, touch.clientY, stream$);
      }
    });

    if (anyHandled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  findTouchableElement(el: Element): ?Element {
    return findWrappingClass(el, "touchable", this.rootElement);
  }

  render() {
    return (
      <div
        ref={this.setRootElement}
        onTouchStart={this.onTouchStart}
        onMouseDown={this.onMouseDown}
        onClick={this.props.onClick}
        className={this.props.className}
        style={this.props.style}
      >
        {this.props.children}
      </div>
    );
  }
}
