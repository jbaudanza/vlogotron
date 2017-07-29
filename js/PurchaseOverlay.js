import PropTypes from "prop-types";
import React from "react";

import Overlay from "./Overlay";
import ActionLink from "./ActionLink";
import Link from "./Link";

import { bindAll } from "lodash";

import styled from "styled-components";
import colors from "./colors";

const stripe = Stripe("pk_test_DHTDixORQV3rdO8tLqEAU72l");

const NevermindLink = styled(Link)`
  color: #333;
  margin-right: 15px;
`;

const StyledStripeWrapper = styled.div`
  background-color: white;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid transparent;
  box-shadow: 0 1px 3px 0 #ababab;
  -webkit-transition: box-shadow 150ms ease;
  transition: box-shadow 150ms ease;
  margin-bottom: 25px;

  &.StripeElement--focus {
    box-shadow: 0 1px 3px 0 #555;
  }

  &.StripeElement--invalid {
    border-color: #fa755a;
  }

  &.StripeElement--webkit-autofill {
    background-color: #fefde5 !important;
  }
`;

export default class PurchaseOverlay extends React.Component {
  constructor() {
    super();
    this.state = { errorMessage: null, complete: false, working: false };
    bindAll(this, "mountStripeElement", "onChange", "onClickPurchase");
  }

  mountStripeElement(el) {
    if (el) {
      this.card = stripe.elements().create("card");
      this.card.addEventListener("change", this.onChange.bind(this));
      this.card.mount(el);
    } else {
      delete this.card;
    }
  }

  onClickPurchase() {
    this.setState({ working: true });

    stripe.createToken(this.card).then(result => {
      this.setState({ working: false });
      if (result.error) {
        // TODO: This might be triggered on an unmounted component
        this.setState({ errorMessage: result.error.message });
      } else {
        console.log("token", result.token);
      }
    });
  }

  onChange(event) {
    this.setState({
      errorMessage: event.error ? event.error.message : null,
      complete: event.complete
    });
  }

  render() {
    return (
      <Overlay onClose={this.props.onClose}>
        <h1>Vlogotron Premium</h1>
        <p>
          {this.context.messages["purchase-premium-description"]({
            PRICE: this.props.price / 100,
            SONG_NAME: this.props.songName
          })}
        </p>
        <p>
          {this.state.errorMessage}
        </p>
        <form>
          <StyledStripeWrapper
            key="stripe-field"
            innerRef={this.mountStripeElement}
          />

          <div>
            <NevermindLink onClick={this.props.onCancel}>
              {this.context.messages["nevermind-action"]()}
            </NevermindLink>

            <ActionLink
              enabled={this.state.complete && !this.state.working}
              onClick={this.onClickPurchase}
            >
              {this.context.messages["purchase-action"]()}
            </ActionLink>
          </div>
        </form>
      </Overlay>
    );
  }
}

PurchaseOverlay.contextTypes = {
  messages: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired
};
