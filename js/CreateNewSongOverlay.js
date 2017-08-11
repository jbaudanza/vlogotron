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

import { bindAll } from "lodash";

function WorkingOverlay(props) {
  return (
    <Overlay {...props}>
      <Spinner size={100} />
    </Overlay>
  );
}

export default class CreateNewSongOverlay extends React.Component {
  state: {
    purchaseSongId: ?string,
    working: boolean
  };

  props: {
    onLogin: string => void,
    onClose: string,
    onNavigate: string => void,
    premiumAccountStatus: boolean,
    currentUser: Object,
    firebase: Object
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

    promise.then(key => console.log("got key", key));

    this.setState({ working: true, purchaseSongId: null });

    // TODO: Perhaps we should disable the X button while this is working.
    promise.then(
      key => {
        this.setState({ working: false });
        this.props.onNavigate("/song-boards/" + key);
      },
      err => {
        console.error(err);
        this.setState({ working: false });
      }
    );
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
            songId={this.state.purchaseSongId}
            onCancel={this.onCancelPurchase}
            currentUser={this.props.currentUser}
            onSelectSong={this.onSelectSong}
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
