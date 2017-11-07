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

declare class ExpressResponse extends http$ServerResponse {
  sendFile(filename: string, options?: Object, fn?: Function): void;
  sendStatus(statusCode: number): void;
  status(statusCode: number): void;
}
