/* @flow */
import * as React from "react";

export default function createAnimatedComponent<Props: Object>(
  InnerComponent: React.ComponentType<Props>,
  shouldAnimate: Props => boolean,
  animationFrame: (Props, any) => void
) {
  return class AnimatedComponent extends React.Component<Props> {
    constructor() {
      super();
      this.setInnerElRef = this.setInnerElRef.bind(this);
    }

    frameId: number;
    innerEl: ?Element;
    setInnerElRef: (el: any) => void;

    componentWillMount() {
      this.checkProps(this.props);
    }

    setInnerElRef(el: any): void {
      if (el) {
        animationFrame(this.props, el);
      }
      this.innerEl = el;
    }

    componentWillUpdate(nextProps: Props) {
      this.checkProps(nextProps);
    }

    checkProps(props: Props) {
      if (shouldAnimate(props)) {
        if (!this.frameId) {
          this.schedule();
        }
      } else {
        if (this.frameId) {
          this.unschedule();
        }
      }
    }

    schedule() {
      this.frameId = window.requestAnimationFrame(this.frame.bind(this));
    }

    unschedule() {
      if (this.frameId) {
        window.cancelAnimationFrame(this.frameId);
        delete this.frameId;
      }
    }

    frame() {
      delete this.frameId;

      if (shouldAnimate(this.props) && this.innerEl) {
        animationFrame(this.props, this.innerEl);
        this.schedule();
      }
    }

    render() {
      return <InnerComponent {...this.props} ref={this.setInnerElRef} />;
    }
  };
}
