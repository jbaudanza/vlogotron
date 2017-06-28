import PropTypes from 'prop-types';
import React from "react";

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { bindAll, forEach, identity, find } from "lodash";

import { findWrappingLink, findWrappingClass } from "./domutils";

const documentMouseMove$ = Observable.fromEvent(document, "mousemove");
const documentMouseUp$ = Observable.fromEvent(document, "mouseup");

export default class TouchableArea extends React.Component {
  constructor() {
    super();
    bindAll(this, "onMouseDown", "setRootElement", "onTouchStart");
    this.touches$$ = new Subject();
  }

  componentWillUnmount() {
    this.touches$$.complete();
  }

  start(firstEl, movements$) {
    if (this.props.onTouchStart)
      this.props.onTouchStart(movements$.startWith(firstEl));

    this.touches$$.next({
      firstEl: firstEl,
      movements$: movements$
    });
  }

  onMouseDown(event) {
    const el = this.findTouchableElement(event.target);

    // Make sure we don't trap an event that was supposed to go to a link
    const link = findWrappingLink(event.target);
    if (link && link !== el) return;

    if (el) {
      const stream$ = documentMouseMove$
        .map(event => this.findTouchableElement(event.target))
        .takeUntil(documentMouseUp$);

      this.start(el, stream$);

      event.preventDefault();
      event.stopPropagation();
    }
  }

  setRootElement(node) {
    this.rootElement = node;

    this.touchMove$ = Observable.fromEvent(this.rootElement, "touchmove");
    this.touchEnd$ = Observable.fromEvent(this.rootElement, "touchend");
    this.touchCancel$ = Observable.fromEvent(this.rootElement, "touchcancel");
  }

  onTouchStart(event) {
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
          .map(t =>
            this.findTouchableElement(
              // TODO: This might not work http://stackoverflow.com/a/33464547/667069
              document.elementFromPoint(t.clientX, t.clientY)
            )
          )
          .takeUntil(end$);

        this.start(el, stream$);
      }
    });

    if (anyHandled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  findTouchableElement(el) {
    return findWrappingClass(el, "touchable", this.rootElement);
  }

  render() {
    return (
      <div
        ref={this.setRootElement}
        onTouchStart={this.onTouchStart}
        onMouseDown={this.onMouseDown}
        className={this.props.className}
        style={this.props.style}
      >
        {this.props.children}
      </div>
    );
  }
}

TouchableArea.propTypes = {
  onTouchStart: PropTypes.func
};
