/* @flow */
import PropTypes from "prop-types";
import * as React from "react";
import Link from "./Link";

import styled from "styled-components";
import colors from "./colors";

type Props = {
  onClose?: string,
  className?: string,
  children: React.Node
};

class Overlay extends React.Component<Props> {
  _keyDownHandler: Function;
  ref: (?HTMLElement) => void;
  rootEl: ?HTMLElement;

  constructor() {
    super();
    this.ref = this.ref.bind(this);
  }

  ref(el: ?HTMLElement) {
    this.rootEl = el
  }

  componentDidMount() {
    this._keyDownHandler = this.onKeyDown.bind(this);
    document.addEventListener("keydown", this._keyDownHandler);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this._keyDownHandler);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event instanceof KeyboardEvent && event.keyCode === 27) {
      // escape
      event.preventDefault();
      if (this.rootEl) {
        const closeLinkEl = this.rootEl.querySelector('a.close-link');
        if (closeLinkEl) {
          closeLinkEl.click();
        }
      }
    }
  }

  render() {
    const className = ((this.props.className || "") + " overlay").trim();

    return (
      <StyledOverlay id="overlay" className={className} innerRef={this.ref}>
        <Shadow />
        <div className="content">
          <CloseLink href={this.props.onClose} className="close-link">
            <svg version="1.1" width="22px" height="21px">
              <use xlinkHref="#svg-close" />
            </svg>
          </CloseLink>
          <div className="scroll">
            {this.props.children}
          </div>
        </div>
      </StyledOverlay>
    );
  }
}

const shadowIndex = 1;

const StyledOverlay = styled.div`
  z-index: 999999;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  h1 {
    font-size: 24px;
    font-weight: 500; // Medium
  }
  h2 {
    font-size: 13px;
    font-weight: 500; // Medium
  }

  .content {
    text-align: center;
    position: relative;
    z-index: ${shadowIndex + 1};
    font-size: 14px;
    padding: 30px 0;
    width: 380px;
    opacity: 1;
    background-color: white;
    border-radius: 6px;
    color: ${colors.charcoalGrey};

    .scroll {
      overflow-y: auto;
      height: 100%;
      width: 100%;
      padding: 0 30px;
      box-sizing: border-box;
    }
  }

`;

const CloseLink = styled(Link)`
  display: block;
  text-align: center;
  color: #999;
  position: absolute;
  right: 17px;
  top: 17px
`;

const Shadow = styled.div`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: ${colors.darkThree};
  opacity: 0.85;
  z-index: ${shadowIndex};
`;

Overlay.propTypes = {
  onClose: PropTypes.string,
  className: PropTypes.string
};

export default Overlay;
