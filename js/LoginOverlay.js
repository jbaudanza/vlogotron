/* @flow */

import PropTypes from "prop-types";
import * as React from "react";

import Overlay from "./Overlay";
import Link from "./Link";

import styled from "styled-components";

const LoginButton = styled(Link)`
  display: block;
  margin-bottom: 10px;
`;

const StyledOverlay = styled(Overlay)`
  .content {
    height: 300px;
  }
`;

const providers = ["Facebook", "Google", "Twitter"];

export default class LoginOverlay
  extends React.Component<{
    onLogin: string => void,
    onClose: string
  }> {
  render() {
    return (
      <StyledOverlay className="login-overlay" onClose={this.props.onClose}>
        <h1>Log in</h1>
        <h2>
          Start creating and sharing music by connecting with one of these services
        </h2>
        {providers.map(provider => (
          <LoginButton
            key={provider}
            onClick={this.props.onLogin.bind(null, provider)}
          >
            <img
              src={"/" + provider.toLocaleLowerCase() + "-login.svg"}
              width="200px"
            />
          </LoginButton>
        ))}
      </StyledOverlay>
    );
  }
}
