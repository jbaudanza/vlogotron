import React from "react";

export default function NoteLabel(props) {
  return (
    <div className={"note-label " + (props.className || "")}>
      {props.note}
      <sub>{props.octave}</sub>
    </div>
  );
}
