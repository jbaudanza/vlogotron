declare class Stripe$instance {
  createToken(StripeCard): Promise<StripeTokenResult>;
  elements(options: Object): StripeElements;
};

declare class StripeTokenResult {
  token?: StripeToken;
  error?: StripeError;
}

declare class StripeToken {
  id: string;
  object: "token";
  bank_account: Object;
  card: Object;
  client_ip: string;
  created: number;
  livemode: boolean;
  type: string;
  used: boolean;
}

declare class StripeError {
  message: string;
  type: string;
  charge: string;
  code: string;
  decline_code: string;
  param: string;
}

declare class StripeCardChangeEvent {
  error: StripeCardError;
  complete: boolean;
}

declare class StripeElements {
  create(type: string): StripeCard
}

declare class StripeCardError {
  message: string;
}

declare class StripeCard {
  mount(HTMLElement): void;
  addEventListener(type: string, handler: Function) : void;
}

declare function Stripe(publishableKey: string): Stripe$instance;
