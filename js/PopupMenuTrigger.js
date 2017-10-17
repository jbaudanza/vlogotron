/* @flow */

import * as React from "react";

import PopupMenu from "./PopupMenu";
import Link from "./Link";

import { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import { findWrappingLink } from "./domutils";

const documentClick$ = Observable.fromEvent(document, "click");
const escapeKeys$ = Observable.fromEvent(document, "keydown").filter(
  event => event.keyCode === 27
);

type Props = {
  options: Array<[string, string, Object]>,
  className: string,
  children: React.Node
};

type State = {
  open: boolean,
  showPosition: ?ClientRect
};

export default class PopupMenuTrigger extends React.Component<Props, State> {
  constructor() {
    super();
    this.state = { open: false, showPosition: null };

    this.trigger = this.trigger.bind(this);
  }

  trigger: MouseEvent => void;
  subscription: Subscription;

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  trigger(event: MouseEvent) {
    if (this.state.showPosition) {
      close();
    } else {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const el = findWrappingLink(target);

      if (el) {
        this.setState({
          showPosition: el.getBoundingClientRect()
        });
      }

      this.subscription = Observable.merge(documentClick$, escapeKeys$)
        .take(1)
        .subscribe(this.close.bind(this));
    }
  }

  close() {
    this.setState({ showPosition: null });

    if (this.subscription) {
      this.subscription.unsubscribe();
      delete this.subscription;
    }
  }

  render() {
    let popup;
    if (this.state.showPosition) {
      popup = (
        <PopupMenu
          options={this.props.options}
          targetRect={this.state.showPosition}
        />
      );
    }

    return (
      <div>
        <Link onClick={this.trigger} className={this.props.className}>
          {this.props.children}
        </Link>
        {popup}
      </div>
    );
  }
}
