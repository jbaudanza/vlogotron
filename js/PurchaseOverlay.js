/* @flow */

import PropTypes from "prop-types";
import * as React from "react";

import Overlay from "./Overlay";
import ActionLink from "./ActionLink";
import Link from "./Link";
import Spinner from "./Spinner";

import { bindAll } from "lodash";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { songs } from "./song";
import styled from "styled-components";
import colors from "./colors";
import { fontFamily } from "./fonts";
import combineTemplate from "./combineTemplate";
import createControlledComponent from "./createControlledComponent";
import { postToAPI } from "./xhr";

function stripePublishableKey() {
  if ("document.location.host" === "localhost:5000") {
    return "pk_test_DHTDixORQV3rdO8tLqEAU72l";
  } else {
    return "pk_live_jBhgS5lUCQBLo8OXOtUf4YJg";
  }
}

const stripe = Stripe(stripePublishableKey());

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
    token: stripeToken.id,
    metadata: { songId }
  };

  return postToAPI("charge", jwt, requestBody);
}

const ErrorMessage = styled.p`
  color: ${colors.red};
`;

export class PurchaseOverlay
  extends React.Component<{
    errorMessage: ?string,
    complete: boolean,
    songId: string,
    working: boolean,
    onChange: StripeCardChangeEvent => void,
    onPurchase: StripeCard => void,
    onCancel: Function,
    onClose: string,
    price: number
  }> {
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
              {this.props.working
                ? <StyledSpinner size={20} fill="white" />
                : this.context.messages["purchase-action"]()}

            </ActionLink>
          </div>
        </form>
      </Overlay>
    );
  }
}

const StyledSpinner = styled(Spinner)`
  margin: 3px 18px 0;
`;

export default createControlledComponent(controller, PurchaseOverlay, [
  "change",
  "purchase"
]);

type OuterProps = {
  songId: string,
  onClose: string,
  price: number,
  onCancel: Function,
  currentUser: Firebase$User,
  onSelectSong: string => void
};

function controller(props$: Observable<OuterProps>, actions) {
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

  const doPurchase$ = stripeTokens$
    .withLatestFrom(jwt$, songId$, (stripeToken, jwt, songId) =>
      createStripeCharge(jwt, songId, stripeToken)
    )
    .switch()
    .retryWhen(errors$ =>
      // Pull out the error to pass to the view and resubscribe
      // $FlowFixMe - I think the rxjs flow defs are broken for this.
      errors$.do(errorsFromNetwork$).mapTo(1)
    )
    .takeUntil(unmount$);

  // It's important that doPurchase is only subscribed once and then shared
  // through the purchaseProcess$ observable.
  const purchaseProcess$ = doPurchase$.publishReplay();
  purchaseProcess$.connect();

  // Call onSelectSong callback when purchase is complete
  purchaseProcess$.withLatestFrom(props$).subscribe(([purchase, props]) => {
    props.onSelectSong(props.songId);
  });

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
  errorMessage: PropTypes.string,
  songId: PropTypes.string
};

PurchaseOverlay.contextTypes = {
  messages: PropTypes.object.isRequired,
  locale: PropTypes.string.isRequired
};
