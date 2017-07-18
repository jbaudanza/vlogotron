import PropTypes from "prop-types";
import React from "react";
import PageHeader from "./PageHeader";

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

    if (event.keyCode === 13) {
      event.preventDefault();

      const newTitle = this.state.newTitle;
      this.setState({ newTitle: null });

      if (!isBlank(this.state.newTitle)) {
        this.props.onChangeTitle(this.state.newTitle);
      }
    }
  }

  onBlur(event) {
    this.setState({ newTitle: null });
  }

  render() {
    return (
      <PageHeader className="song-editor-header">
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
      </PageHeader>
    );
  }
}

SongEditorHeader.propTypes = {
  onChangeTitle: PropTypes.func.isRequired,
  primaryAction: PropTypes.object.isRequired,
  primaryActionLabel: PropTypes.string.isRequired,
  secondaryAction: PropTypes.object.isRequired,
  secondaryActionLabel: PropTypes.string.isRequired
};

function isBlank(string) {
  return string == null || string.trim() === "";
}
