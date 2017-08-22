declare class APIUser {
  uid: string;
  email: string;
  name: string;
}

declare class ExpressRequest extends http$IncomingMessage {
  ip: string;
  body: Object;
  user?: APIUser
}
