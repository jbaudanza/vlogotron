/* @flow */

import PropTypes from "prop-types";
import * as React from "react";

export default class Message extends React.Component<{ msgKey: string }> {
  render() {
    return this.context.messages[this.props.msgKey](this.props);
  }
}

Message.contextTypes = {
  messages: PropTypes.object.isRequired
};
