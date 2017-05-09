import React from "react";

import PopupMenu from "./PopupMenu";
import Link from "./Link";

import { Observable } from "rxjs/Observable";
import { findWrappingLink } from "./domutils";

const documentClick$ = Observable.fromEvent(document, "click");
const escapeKeys$ = Observable.fromEvent(document, "keydown").filter(
  event => event.keyCode === 27
);

function pointBelow(rect) {
  return {
    left: rect.left + rect.width / 2,
    top: rect.top + rect.height
  };
}

function pointAbove(rect) {
  return {
    left: rect.left + rect.width / 2,
    top: rect.top - 500
  };
}

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
      let where;
      if (this.props.direction === "above") {
        where = pointAbove(this.state.showPosition);
      } else {
        where = pointBelow(this.state.showPosition);
      }

      popup = <PopupMenu {...where} options={this.props.options} />;
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
  options: React.PropTypes.array.isRequired
};
