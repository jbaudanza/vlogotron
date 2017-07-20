import PropTypes from "prop-types";
import React from "react";
import styled from "styled-components";

import { bindAll } from "lodash";

import Link from "./Link";

export default class EditableTitle extends React.Component {
  constructor() {
    super();
    this.state = { newValue: null };
    bindAll(this, "onChange", "startEditing", "onKeyDown", "onBlur");
  }

  onChange(event) {
    this.setState({ newValue: event.target.value });
  }

  startEditing() {
    this.setState({ newValue: this.props.value });
  }

  inputRef(inputEl) {
    if (inputEl) inputEl.focus();
  }

  onKeyDown(event) {
    if (event.keyCode === 27) {
      // escape
      event.preventDefault();
      this.setState({ newValue: null });
    }

    if (event.keyCode === 13) {
      event.preventDefault();

      const newValue = this.state.newValue;
      this.setState({ newValue: null });

      if (!isBlank(this.state.newValue)) {
        this.props.onChange(this.state.newValue);
      }
    }
  }

  onBlur(event) {
    this.setState({ newValue: null });
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

EditableTitle.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func
};

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
  font-family: HKGrotesk, sans-serif;
  margin: 0 auto;
  width: 216px;
`;
