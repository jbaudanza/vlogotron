import React from "react";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import ReactActions from "./ReactActions";

export default function createControlledComponent(
  controller,
  Component,
  actionNames
) {
  return class ControlledComponent extends React.Component {
    constructor(props) {
      super();
      this.props$ = new BehaviorSubject(props);
      this.state = { current: {} };
      this.actions = new ReactActions(actionNames);
    }

    componentWillMount() {
      const observable$ = controller(
        this.props$.asObservable(),
        this.actions.observables
      );
      this.subscription = observable$.subscribe(current =>
        this.setState({ current })
      );
    }

    componentWillReceiveProps(nextProps) {
      this.props$.next(nextProps);
    }

    componentWillUnmount() {
      this.props$.complete();
      this.actions.completeAll();
      this.subscription.unsubscribe();
    }

    render() {
      return <Component {...this.actions.callbacks} {...this.state.current} />;
    }
  };
}
