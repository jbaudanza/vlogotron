/* @flow */
import React from "react";

import styled from "styled-components";
import colors from "./colors";

const TextInput = styled.input`
  height: 48px;
  box-sizing: border-box;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  border: solid 1px #d1d1d1;
  color: ${colors.charcoalGrey};
  padding-left: 14px;
  font-size: 13px;
  flex-grow: 1;
`;

const CopyButton = styled.a`
  height: 48px;
  line-height: 48px;
  box-sizing: border-box;
  color: ${colors.charcoalGrey};
  border: solid 1px #d1d1d1;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  border-left: none;
  text-transform: uppercase;
  text-decoration: none;
  text-align: center;
  width: 55px;

  font-size: 12px;
  font-weight: 500;

  color: ${props => (props.recentlyCopied ? "#fff" : colors.duskyBlue)};
  background-color: ${props => (props.recentlyCopied ? colors.duskyBlue : "#fff")};
`;

const TextWithCopyButtonWrapper = styled.div`
  display: flex;
`;

function onClickInput(event) {
  event.target.select();
}

export default class TextWithCopyButton extends React.Component {
  inputEl: HTMLInputElement;
  timeoutId: number;
  inputRef: Function;

  constructor() {
    super();
    this.inputRef = this.inputRef.bind(this);
  }

  state: {
    supported: boolean,
    recentlyCopied: boolean
  };

  componentWillMount() {
    const supported =
      typeof document.queryCommandSupported === "function" &&
      document.queryCommandSupported("copy");
    this.setState({ supported });
  }

  componentWillUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  copyToClipboard(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // See https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
    if (this.inputEl) {
      this.inputEl.select();
      if (document.execCommand("copy")) {
        this.setState({ recentlyCopied: true });

        if (this.timeoutId) clearTimeout(this.timeoutId);

        this.timeoutId = setTimeout(
          () => this.setState({ recentlyCopied: false }),
          1000
        );
      }
    }
  }

  inputRef(el: HTMLInputElement) {
    this.inputEl = el;
  }

  render() {
    return (
      <TextWithCopyButtonWrapper className={this.props.className}>
        <TextInput
          value={this.props.value}
          readOnly
          innerRef={this.inputRef}
          onClick={onClickInput}
        />
        {this.state.supported
          ? <CopyButton
              recentlyCopied={this.state.recentlyCopied}
              href="#"
              onClick={this.copyToClipboard.bind(this)}
            >
              {this.state.recentlyCopied ? "copied" : "copy"}
            </CopyButton>
          : null}
      </TextWithCopyButtonWrapper>
    );
  }
}
