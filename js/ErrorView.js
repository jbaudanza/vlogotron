import React from "react";

import Page from "./Page";

class ErrorView extends React.Component {
  render() {
    return (
      <Page
        sidebarVisible={false}
        header={<div />}
        onChangeLocale={this.props.onChangeLocale}
        className="error-page"
      >
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
      </Page>
    );
  }
}

ErrorView.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

export default ErrorView;
