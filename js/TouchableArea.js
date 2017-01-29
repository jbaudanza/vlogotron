import React from 'react';

import {Observable} from 'rxjs/Observable';

Object.assign(Observable,
  require('rxjs/observable/fromEvent'),
  require('rxjs/observable/merge')
);

import {Subject} from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/map';


import {bindAll, forEach, identity, find} from 'lodash';

import {findParentNode} from './domutils'

const documentMouseMove$ = Observable.fromEvent(document, 'mousemove');
const documentMouseUp$ = Observable.fromEvent(document, 'mouseup');


export default class TouchableArea extends React.Component {
  constructor() {
    super();
    bindAll(this, 'onMouseDown', 'setRootElement', 'onTouchStart');
  }

  onMouseDown(event) {
    const el = this.findTouchableElement(event.target);

    if (el) {
      const stream$ = documentMouseMove$
        .map(event => this.findTouchableElement(event.target))
        .takeUntil(documentMouseUp$)
        .startWith(el);

      this.props.onTouchStart(stream$);

      event.preventDefault();
      event.stopPropagation();
    }
  }

  setRootElement(node) {
    this.rootElement = node;

    this.touchMove$ = Observable.fromEvent(this.rootElement, 'touchmove');
    this.touchEnd$ = Observable.fromEvent(this.rootElement, 'touchend');
    this.touchCancel$ = Observable.fromEvent(this.rootElement, 'touchcancel');
  }

  onTouchStart(event) {
    let anyHandled = false;

    forEach(event.changedTouches, (touch) => {
      const el = this.findTouchableElement(touch.target);

      if (el) {
        const identifier = touch.identifier;

        anyHandled = true;

        function filterTouches(stream$) {
          return stream$
              .map(e => find(e.changedTouches, t => t.identifier === identifier))
              .filter(identity)
        }

        const end$ = Observable.merge(
            filterTouches(this.touchEnd$),
            filterTouches(this.touchCancel$),
        );

        const stream$ = filterTouches(this.touchMove$)
            .map(t => this.findTouchableElement(
              // TODO: This might not work http://stackoverflow.com/a/33464547/667069
              document.elementFromPoint(t.clientX, t.clientY)
            ))
            .takeUntil(end$)
            .startWith(el);

        this.props.onTouchStart(stream$);
      }
    });

    if (anyHandled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  findTouchableElement(el) {
    return findParentNode(
        el,
        (el) => el.classList && el.classList.contains('touchable'),
        this.rootElement
    );
  }

  render() {
    return (
      <div ref={this.setRootElement}
          onTouchStart={this.onTouchStart}
          onMouseDown={this.onMouseDown}
          className={this.props.className}>
        {this.props.children}
      </div>
    );
  }
}

TouchableArea.propTypes = {
  onTouchStart: React.PropTypes.func.isRequired
}
