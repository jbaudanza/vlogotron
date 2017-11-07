/* @flow */

import PropTypes from "prop-types";
import * as React from "react";
import styled from "styled-components";

import { bindAll } from "lodash";
import { fontFamily } from "./fonts";

import Link from "./Link";

type Props = {
  onChange?: Function,
  value: string,
  className?: string
};

type State = {
  newValue: ?string
};

export default class EditableTitle extends React.Component<Props, State> {
  constructor() {
    super();
    this.state = { newValue: null };
    bindAll(this, "onChange", "startEditing", "onKeyDown", "onBlur");
  }

  onChange(event: SyntheticEvent<>) {
    const el = event.target;
    if (el instanceof HTMLInputElement) {
      this.setState({ newValue: el.value });
    }
  }

  startEditing() {
    this.setState({ newValue: this.props.value });
  }

  inputRef(inputEl: HTMLInputElement) {
    if (inputEl) inputEl.focus();
  }

  onKeyDown(event: SyntheticKeyboardEvent<>) {
    if (event.keyCode === 27) {
      // escape
      event.preventDefault();
      this.setState({ newValue: null });
    }

    if (event.keyCode === 13) {
      event.preventDefault();

      const newValue = this.state.newValue;
      this.setState({ newValue: null });

      if (!isBlank(this.state.newValue) && this.props.onChange) {
        this.props.onChange(this.state.newValue);
      }
    }
  }

  onBlur(event: SyntheticEvent<>) {
    this.setState({ newValue: null });

    if (!isBlank(this.state.newValue) && this.props.onChange) {
      this.props.onChange(this.state.newValue);
    }
  }

  render() {
    if (this.state.newValue != null) {
      return (
        <StyledInput
          className={this.props.className}
          type="text"
          innerRef={this.inputRef}
          value={this.state.newValue}
          onChange={this.onChange}
          onBlur={this.onBlur}
          onKeyDown={this.onKeyDown}
        />
      );
    } else {
      if (this.props.onChange) {
        return (
          <StyledLink
            onClick={this.startEditing}
            className={this.props.className}
          >
            <StyledTitle>
              {this.props.value}
            </StyledTitle>
            <svg version="1.1" width="13px" height="13px">
              <use xlinkHref="#svg-pencil" fill="white" />
            </svg>
          </StyledLink>
        );
      } else {
        return (
          <StyledTitle className={this.props.className}>
            {this.props.value}
          </StyledTitle>
        );
      }
    }
  }
}

function isBlank(string) {
  return string == null || string.trim() === "";
}

const StyledLink = styled(Link)`
  text-decoration: none;
  color: white;

  span {
    margin-right: 10px;
  }
`;

const StyledTitle = styled.span`
  font-size: 18px;
`;

const StyledInput = styled.input`
  font-family: ${fontFamily};
  margin: 0 auto;
  width: 216px;
`;
