/* @noflow - flow annotations on HOC are tricky */

import React from "react";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Subscription } from "rxjs/Subscription";

import ReactActions from "./ReactActions";

export default function createControlledComponent<OuterPropTypes, InnerPropTypes>(
  controller: (OuterPropTypes, Object, Subscription) => InnerPropTypes,
  Component: React.Component<{}, InnerPropTypes, {}>,
  actionNames: Array<string> = [],
  InitialComponent: React.Component
): React.Component {
  if (!InitialComponent) {
    InitialComponent = Component;
  }

  return class ControlledComponent extends React.Component {
    constructor(props) {
      super();
      this.state = {};
      this.props$ = new BehaviorSubject(props);
      this.actions = new ReactActions(actionNames);
    }

    componentWillMount() {
      this.subscription = new Subscription();

      const observable$ = controller(
        this.props$.asObservable(),
        this.actions.observables,
        this.subscription
      );

      this.subscription.add(
        observable$.subscribe(current => this.setState({ current }))
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
      if (this.state.current) {
        return (
          <Component
            {...this.actions.callbacks}
            actions={this.actions}
            {...this.state.current}
          />
        );
      } else {
        return (
          <InitialComponent
            {...this.actions.callbacks}
            actions={this.actions}
          />
        );
      }
    }
  };
}
