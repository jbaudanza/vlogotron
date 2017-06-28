import PropTypes from 'prop-types';
import React from "react";

class ErrorView extends React.Component {
  render() {
    return (
      <div className="page-vertical-wrapper error-page">
        <div className="page-content">
          <div className="error-code">
            <span style={{ fontSize: "125px" }}>4</span>
            <svg version="1.1" width={100} height={125}>
              <use xlinkHref="#svg-broken-tv" />
            </svg>
            <span style={{ fontSize: "125px" }}>4</span>
          </div>
          <div className="error-message">
            {this.context.messages["not-found-error"]()}
          </div>
        </div>
      </div>
    );
  }
}

ErrorView.contextTypes = {
  messages: PropTypes.object.isRequired
};

export default ErrorView;
