import React from "react";

export default function NoteLabel(props) {
  const match = props.note.match(/([A-Z])([#b])?(\d)/);
  if (match) {
    return (
      <div className={"note-label " + (props.className || "")}>
        {match[1]}
        {match[2] ? <sup>{match[2]}</sup> : null}
        <sub>{match[3]}</sub>
      </div>
    );
  } else {
    return null;
  }
}
