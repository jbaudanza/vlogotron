import PropTypes from "prop-types";
import React from "react";

import ChooseSongOverlay from "./ChooseSongOverlay";
import LoginOverlay from "./LoginOverlay";
import PurchaseOverlay from "./PurchaseOverlay";

import createControlledComponent from "./createControlledComponent";

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
  constructor() {
    super();
    this.state = { purchaseForm: false };
  }

  onSelect() {
    const tokenPromise = this.props.currentUser.getToken();

    const handler = StripeCheckout.configure({
      key: "pk_test_DHTDixORQV3rdO8tLqEAU72l",
      image: "https://stripe.com/img/documentation/checkout/marketplace.png",
      locale: "auto",
      token: onToken.bind(null, tokenPromise)
    });

    handler.open({
      name: "Vlogotron",
      description: "2 Widgets",
      amount: 199
    });
  }

  render() {
    const price = 199;

    if (this.props.currentUser) {
      if (this.state.purchaseForm) {
        return (
          <PurchaseOverlay
            onClose={this.props.onClose}
            price={price}
            songName="The Entertainer"
            onCancel={() => this.setState({ purchaseForm: false })}
          />
        );
      }
      return (
        <ChooseSongOverlay
          price={price}
          premiumAccount={false}
          onClose={this.props.onClose}
          onSelect={() => this.setState({ purchaseForm: true })}
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
