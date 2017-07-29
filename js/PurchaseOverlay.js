import React from "react";

import Overlay from "./Overlay";
import ActionLink from "./ActionLink";

import { bindAll } from "lodash";

import styled from "styled-components";
import colors from "./colors";

const stripe = Stripe("pk_test_DHTDixORQV3rdO8tLqEAU72l");


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
          This one-time purchase of
          {" "}
          {this.props.price}
          {" "}
          gives you access to "
          {this.props.songName}
          " and all the other premium songs on Vlogotron.
        </p>
        <p>
          {this.state.errorMessage}
        </p>
        <form>
          <StyledStripeWrapper
            key="stripe-field"
            innerRef={this.mountStripeElement}
          />

          <ActionLink
            enabled={this.state.complete && !this.state.working}
            onClick={this.onClickPurchase}
          >
            Purchase
          </ActionLink>
        </form>
      </Overlay>
    );
  }
}
