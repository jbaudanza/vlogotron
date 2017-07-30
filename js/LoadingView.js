/* @flow */

import React from "react";

export default function LoadingView() {
  return (
    <div className="page-vertical-wrapper">
      <div className="page-content initial-loading">
        <svg version="1.1" width="100px" height="100px" className="spinner">
          <use xlinkHref="#svg-spinner" />
        </svg>
        loading...
      </div>
    </div>
  );
}
