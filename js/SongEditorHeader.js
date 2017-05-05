import React from "react";

import { bindAll } from "lodash";

import Link from "./Link";

export default class SongEditorHeader extends React.Component {
  constructor() {
    super();

    this.state = { newTitle: null };

    bindAll(
      this,
      "startEditing",
      "inputRef",
      "onBlur",
      "onKeyDown",
      "onChangeTitle"
    );
  }

  onChangeTitle(event) {
    this.setState({ newTitle: event.target.value });
  }

  startEditing() {
    this.setState({ newTitle: this.props.songTitle });
  }

  inputRef(inputEl) {
    if (inputEl) inputEl.focus();
  }

  onKeyDown(event) {
    if (event.keyCode === 27) {
      // escape
      event.preventDefault();
      this.setState({ newTitle: null });
    }

    if (event.keyCode === 13 && !isBlank(this.state.newTitle)) {
      // enter
      event.preventDefault();
      this.setState({ newTitle: null });
      this.props.onChangeTitle(this.state.newTitle);
    }
  }

  onBlur(event) {
    this.setState({ newTitle: null });
  }

  render() {
    return (
      <div className="page-header song-editor-header">
        <div className="first">
          <Link className="action" {...this.props.secondaryAction}>
            {this.props.secondaryActionLabel}
          </Link>
        </div>
        <div className="middle">
          {this.state.newTitle != null
            ? <input
                type="text"
                ref={this.inputRef}
                value={this.state.newTitle}
                onChange={this.onChangeTitle}
                onBlur={this.onBlur}
                onKeyDown={this.onKeyDown}
              />
            : <Link onClick={this.startEditing}>
                <span className="song-title">
                  {this.props.songTitle}
                </span>
                <svg version="1.1" width="13px" height="13px">
                  <use xlinkHref="#svg-pencil" fill="white" />
                </svg>
              </Link>}
        </div>
        <div className="last">
          <Link className="action primary" {...this.props.primaryAction}>
            {this.props.primaryActionLabel}
          </Link>
        </div>
      </div>
    );
  }
}

SongEditorHeader.propTypes = {
  onChangeTitle: React.PropTypes.func.isRequired
};

function isBlank(string) {
  string == null || string.trim() === "";
}
