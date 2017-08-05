/* @flow */

import PropTypes from "prop-types";
import React from "react";

import { createSongBoard } from "./database";

import ChooseSongOverlay from "./ChooseSongOverlay";
import LoginOverlay from "./LoginOverlay";
import PurchaseOverlay from "./PurchaseOverlay";
import Overlay from "./Overlay";
import Spinner from "./Spinner";

import createControlledComponent from "./createControlledComponent";

import { songs } from "./song";

import { bindAll } from "lodash";

function WorkingOverlay(props) {
  return (
    <Overlay {...props}>
      <Spinner size={100}/>
    </Overlay>
  );
}

function onToken(jwtPromise, stripeToken) {
  jwtPromise.then(jwt => {
    const requestBody = JSON.stringify({
      jwt: jwt,
      token: stripeToken.id
    });

    fetch("http://localhost:5002/vlogotron-95daf/us-central1/charge", {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      },
      body: requestBody
    });
  });
}

export default class CreateNewSongOverlay extends React.Component {
  state: {
    purchaseSongId: ?string,
    working: boolean
  };

  constructor() {
    super();
    this.state = { purchaseSongId: null, working: false };
    bindAll(this, "onSelectSong", "onRequestPurchase", "onCancelPurchase");
  }

  onSelectSong(songId: string) {
    const promise = createSongBoard(
      this.props.firebase.database(),
      this.props.currentUser.uid,
      songId
    );

    this.setState({ working: true });

    promise.then((key) => {
      alert(key);
      this.setState({ working: false })
    }, (err) => {
      console.error(err);
      this.setState({ working: false })
    })

    /*
    const tokenPromise = this.props.currentUser.getToken();

    // XXX: Do something with this
    onToken.bind(null, tokenPromise);
    */
  }

  onRequestPurchase(songId: string) {
    this.setState({ purchaseSongId: songId });
  }

  onCancelPurchase() {
    this.setState({ purchaseSongId: null });
  }

  render() {
    const price = 199;

    if (this.state.working) {
      return <WorkingOverlay onClose={this.props.onClose} />;
    }

    if (this.props.currentUser) {
      if (this.state.purchaseSongId) {
        return (
          <PurchaseOverlay
            onClose={this.props.onClose}
            price={price}
            songName={songs[this.state.purchaseSongId].title}
            onCancel={this.onCancelPurchase}
          />
        );
      }
      return (
        <ChooseSongOverlay
          price={price}
          premiumAccount={false}
          onClose={this.props.onClose}
          audioSources={{}}
          premiumAccountStatus={this.props.premiumAccountStatus}
          onRequestPurchase={this.onRequestPurchase}
          onSelectSong={this.onSelectSong}
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
  premiumAccountStatus: PropTypes.bool.isRequired,
  currentUser: PropTypes.object
};

function controller(props$, actions, subscription) {}

//export default createControlledComponent(CreateNewSongOverlay, controller);
