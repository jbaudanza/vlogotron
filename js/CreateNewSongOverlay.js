import PropTypes from "prop-types";
import React from "react";

import ChooseSongOverlay from "./ChooseSongOverlay";
import LoginOverlay from "./LoginOverlay";

import createControlledComponent from "./createControlledComponent";

export default class CreateNewSongOverlay extends React.Component {
  render() {
    if (this.props.currentUser) {
      return (
        <ChooseSongOverlay
          onClose={this.props.onClose}
          onSelect={() => false}
        />
      );
    } else {
      return <LoginOverlay {...this.props} />;
    }
  }
}

CreateNewSongOverlay.propTypes = {
  onLogin: PropTypes.func.isRequired,
  onClose: PropTypes.string.isRequired,
  currentUser: PropTypes.object
};

function controller(props$, actions, subscription) {}

//export default createControlledComponent(CreateNewSongOverlay, controller);
