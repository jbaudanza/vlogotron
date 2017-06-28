import PropTypes from 'prop-types';
import React from "react";

import PopupMenu from "./PopupMenu";
import Link from "./Link";

import { Observable } from "rxjs/Observable";
import { findWrappingLink } from "./domutils";

const documentClick$ = Observable.fromEvent(document, "click");
const escapeKeys$ = Observable.fromEvent(document, "keydown").filter(
  event => event.keyCode === 27
);

export default class PopupMenuTrigger extends React.Component {
  constructor() {
    super();
    this.state = { open: false, showPosition: null };

    this.trigger = this.trigger.bind(this);
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  trigger(event) {
    if (this.state.showPosition) {
      close();
    } else {
      const el = findWrappingLink(event.target);

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

PopupMenuTrigger.propTypes = {
  options: PropTypes.array.isRequired
};
