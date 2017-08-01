declare class Stripe$instance {
  createToken(StripeCard): Promise;
  elements(options: Object): StripeElements;
};

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
