/* @flow */

import React from "react";
import Spinner from "./Spinner";

export default function LoadingView() {
  return (
    <div className="page-vertical-wrapper">
      <div className="page-content initial-loading">

        <Spinner size={100} />
        loading...
      </div>
    </div>
  );
}
