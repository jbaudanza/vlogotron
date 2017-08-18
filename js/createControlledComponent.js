/* @noflow - flow annotations on HOC are tricky. Use this as a guide: https://gist.github.com/faergeek/d7bbe4d638f71be915b040865044397b */

import React from "react";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Subscription } from "rxjs/Subscription";
import type { Observable } from "rxjs/Observable";

import ReactActions from "./ReactActions";

export default function createControlledComponent<
  OuterPropTypes,
  InnerPropTypes
>(
  controller: (
    Observable<OuterPropTypes>,
    Object,
    Subscription
  ) => InnerPropTypes,
  Component: Class<React.Component<InnerPropTypes>>,
  actionNames: Array<string> = [],
  InitialComponent: Class<React.Component>
): React.Component<*, *, *> {
  if (!InitialComponent) {
    InitialComponent = Component;
  }

  return class ControlledComponent extends React.Component<InnerPropTypes> {
    state: {
      current?: InnerPropTypes
    };

    props$: BehaviorSubject<OuterPropTypes>;
    actions: ReactActions;
    subscription: Subscription;

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
