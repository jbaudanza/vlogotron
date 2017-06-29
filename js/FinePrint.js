import PropTypes from "prop-types";
import React from "react";

export default class FinePrint extends React.Component {
  render() {
    return (
      <div className="fine-print">
        <a href="/terms_of_service.html">
          {this.context.messages["terms-of-service-link"]()}
        </a>
        <span> / </span>
        <a href="/privacy_policy.html">
          {this.context.messages["privacy-policy-link"]()}
        </a>
        <span> / </span>
        <a href="https://github.com/jbaudanza">
          {this.context.messages["contact-link"]()}
        </a>
      </div>
    );
  }
}

FinePrint.contextTypes = {
  messages: PropTypes.object.isRequired
};
