/* @flow */

import PropTypes from "prop-types";
import React from "react";

import Overlay from "./Overlay";
import ActionLink from "./ActionLink";
import Link from "./Link";

import { bindAll } from "lodash";
import { Observable } from "rxjs/Observable";

import { songs } from "./song";
import styled from "styled-components";
import colors from "./colors";
import { fontFamily } from "./fonts";

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
    border-color: ${colors.red};
  }

  &.StripeElement--webkit-autofill {
    background-color: #fefde5 !important;
  }
`;

function createStripeCharge(
  jwtPromise: Promise<string>,
  songId: string,
  stripeToken: StripeToken
) {
  return jwtPromise.then(jwt => {
    const requestBody = {
      jwt: jwt,
      token: stripeToken.id,
      metadata: { songId }
    };

    // TODO: Card declined errors are getting reported as "ajax error 402"
    return Observable.ajax
      .post(
        "https://us-central1-vlogotron-95daf.cloudfunctions.net/charge",
        requestBody,
        { "Content-Type": "application/json" }
      )
      .toPromise();
  });
}

const ErrorMessage = styled.p`
  color: ${colors.red};
`;

export default class PurchaseOverlay extends React.Component {
  state: {
    errorMessage: ?string,
    complete: boolean,
    working: boolean
  };

  card: StripeCard;

  constructor() {
    super();
    this.state = { errorMessage: null, complete: false, working: false };
    bindAll(this, "mountStripeElement", "onChange", "onClickPurchase");
  }

  mountStripeElement(el: HTMLElement) {
    if (el) {
      this.card = stripe
        .elements({ locale: this.context.locale })
        .create("card", {
          style: {
            base: { fontFamily: fontFamily },
            invalid: { color: colors.red }
          }
        });
      this.card.addEventListener("change", this.onChange.bind(this));
      this.card.mount(el);
    } else {
      delete this.card;
    }
  }

  onClickPurchase() {
    this.setState({ working: true, errorMessage: null });

    const promise = stripe.createToken(this.card).then(result => {
      if (result.error) {
        throw result.error;
      } else {
        const jwtPromise = this.props.currentUser.getToken();
        if (result.token) {
          return createStripeCharge(
            jwtPromise,
            this.props.songId,
            result.token
          );
        }
      }
    });

    // TODO: Handle the case where the component is unmounted while the promise
    // is in progress
    promise.then(
      result => {
        // TODO: Call some onSelectSong callback
        this.setState({ working: false });
      },
      (error: StripeError) => {
        this.setState({
          working: false,
          errorMessage: error.message
        });
      }
    );
  }

  onChange(event: StripeCardChangeEvent) {
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
            SONG_NAME: songs[this.props.songId].title
          })}
        </p>
        <ErrorMessage>
          {this.state.errorMessage}
        </ErrorMessage>
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

function controller(props$, actions, subscription) {
  const unmount$ = props$.ignoreElements().concatWith(1);

  actions.purchase$;
}

PurchaseOverlay.contextTypes = {
  messages: PropTypes.object.isRequired,
  locale: PropTypes.string.isRequired
};

PurchaseOverlay.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onToken: PropTypes.func.isRequired,
  currentUser: PropTypes.object.isRequired,
  songId: PropTypes.string.isRequired
};
