/* @flow */

import PropTypes from "prop-types";
import React from "react";

import classNames from "classnames";
import Link from "./Link";

export default class PageTextFooter extends React.Component {
  render() {
    return (
      <div
        className={classNames("page-footer page-text-footer", {
          hidden: this.props.text == null,
          error: this.props.error
        })}
      >
        <div className="page-footer-content">
          {this.props.error
            ? <div className="page-footer-content">
                {this.props.text}
                <Link
                  className="action primary"
                  onClick={this.props.onDismissError}
                >
                  {this.context.messages["ok-action"]()}
                </Link>
              </div>
            : <div className="page-footer-content">
                {this.props.text}
              </div>}
        </div>
      </div>
    );
  }
}

PageTextFooter.contextTypes = {
  messages: PropTypes.object.isRequired
};

PageTextFooter.propTypes = {
  text: PropTypes.string.isRequired,
  onDismissError: PropTypes.func.isRequired,
  error: PropTypes.bool
};
