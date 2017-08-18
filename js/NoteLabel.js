/* @flow */

import * as React from "react";

export default function NoteLabel(props: Object) {
  return (
    <div className={"note-label " + (props.className || "")}>
      {props.note}
      <sub>{props.octave}</sub>
    </div>
  );
}
