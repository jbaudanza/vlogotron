import React from "react";

export default function NoteLabel(props) {
  return (
    <div className={"note-label " + (props.className || "")}>
      {props.note}
    </div>
  );
}
