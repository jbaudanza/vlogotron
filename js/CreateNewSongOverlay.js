/* @flow */

import PropTypes from "prop-types";
import * as React from "react";

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

export default class CreateNewSongOverlay
  extends React.Component<
    {
      onClose: string,
      premiumAccountStatus: boolean,
      onSelectSong: string => void,
      currentUser: Object
    },
    {
      purchaseSongId: ?string,
      working: boolean
    }
  > {
  constructor() {
    super();
    this.state = { purchaseSongId: null, working: false };
    bindAll(this, "onSelectSong", "onRequestPurchase", "onCancelPurchase");
  }

  onSelectSong(songId: string) {
    // TODO: Perhaps we should disable the X button while this is working.
    this.setState({ working: true, purchaseSongId: null });
    this.props.onSelectSong(songId);
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
    } else {
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
    }
  }
}
