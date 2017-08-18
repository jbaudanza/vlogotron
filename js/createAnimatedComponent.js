/* @flow */
import * as React from "react";

export default function createAnimatedComponent(
  InnerComponent: any,
  shouldAnimate: Object => boolean,
  animationFrame: (Object, any) => void
) {
  return class AnimatedComponent extends React.Component<Object> {
    frameId: number;
    innerEl: Element;

    componentWillMount() {
      this.checkProps(this.props);
    }

    setInnerElRef(el: Element) {
      if (el) {
        animationFrame(this.props, el);
      }
      this.innerEl = el;
    }

    componentWillUpdate(nextProps: Object) {
      this.checkProps(nextProps);
    }

    checkProps(props: Object) {
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
      return (
        <InnerComponent {...this.props} ref={this.setInnerElRef.bind(this)} />
      );
    }
  };
}
