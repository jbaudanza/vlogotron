/* @flow */

import PropTypes from "prop-types";
import React from "react";

import Overlay from "./Overlay";
import ActionLink from "./ActionLink";
import Link from "./Link";

import { bindAll } from "lodash";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { songs } from "./song";
import styled from "styled-components";
import colors from "./colors";
import { fontFamily } from "./fonts";
import combineTemplate from "./combineTemplate";
import createControlledComponent from "./createControlledComponent";
import { postJSON, httpOk } from "./xhr";

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
  jwt: string,
  songId: string,
  stripeToken: StripeToken
) {
  const requestBody = {
    jwt: jwt,
    token: stripeToken.id,
    metadata: { songId }
  };

  return postJSON(
    "https://us-central1-vlogotron-95daf.cloudfunctions.net/charge",
    requestBody
  ).do(xhr => {
    if (!httpOk(xhr.status)) {
      throw JSON.parse(xhr.responseText);
    }
  });
}

const ErrorMessage = styled.p`
  color: ${colors.red};
`;

export class PurchaseOverlay extends React.Component {
  props: {
    errorMessage: ?string,
    complete: boolean,
    songId: string,
    working: boolean,
    onChange: StripeCardChangeEvent => void,
    onPurchase: StripeCard => void,
    onCancel: Function,
    onClose: Function,
    price: number
  };

  card: StripeCard;

  constructor() {
    super();
    bindAll(this, "mountStripeElement", "onClickPurchase");
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
      this.card.addEventListener("change", this.props.onChange);
      this.card.mount(el);
    } else {
      delete this.card;
    }
  }

  onClickPurchase() {
    this.props.onPurchase(this.card);
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
          {this.props.errorMessage}
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
              enabled={this.props.complete && !this.props.working}
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

export default createControlledComponent(controller, PurchaseOverlay, [
  "change",
  "purchase"
]);

function controller(props$, actions, subscription) {
  const unmount$ = props$.ignoreElements().concatWith(1);

  const songId$ = props$.map(props => props.songId);

  const jwt$: Observable<string> = props$.switchMap(props =>
    props.currentUser.getToken()
  );
  const purchase$: Observable<StripeCard> = actions.purchase$;
  const change$: Observable<StripeCardChangeEvent> = actions.change$;

  const complete$ = change$.map(event => event.complete).startWith(false);

  const stripeTokens$: Observable<StripeToken> = purchase$.switchMap(card =>
    stripe.createToken(card).then(result => {
      if (result.token) return result.token;
      else throw result.error;
    })
  );

  const errorsFromNetwork$ = new Subject();

  // TODO: We need to derive:
  // - success events that should trigger some callback

  const doPurchase$ = stripeTokens$
    .withLatestFrom(jwt$, songId$, (stripeToken, jwt, songId) =>
      createStripeCharge(jwt, songId, stripeToken)
    )
    .switch()
    .retryWhen(errors$ =>
      // Pull out the error to pass to the view and resubscribe
      errors$.do(errorsFromNetwork$).mapTo(1)
    )
    .takeUntil(unmount$);

  // It's important that doPurchase is only subscribed once and then shared
  // through the purchaseProcess$ observable.
  const purchaseProcess$ = doPurchase$.publishReplay();
  purchaseProcess$.connect();

  const errorMessage$ = Observable.merge(
    // Errors from the Stripe Elements control
    change$.map(event => (event.error ? event.error.message : null)),
    // Errors from createToken to the POST to /charge
    errorsFromNetwork$.map(e => e.message)
  ).startWith(null);

  const working$ = Observable.merge(
    purchase$.mapTo(true),
    errorsFromNetwork$.mapTo(false)
  ).startWith(false);

  return combineTemplate({
    working: working$,
    songId: songId$,
    complete: complete$,
    errorMessage: errorMessage$,
    onCancel: props$.map(p => p.onCancel),
    price: props$.map(p => p.price),
    onClose: props$.map(p => p.onClose)
  });
}

PurchaseOverlay.propTypes = {
  complete: PropTypes.bool.isRequired,
  working: PropTypes.bool.isRequired,
  price: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
  errorMessage: PropTypes.string
};

PurchaseOverlay.contextTypes = {
  messages: PropTypes.object.isRequired,
  locale: PropTypes.string.isRequired
};
