declare class Firebase$Database {
  ref(key: string): Object;
}

declare class Firebase$Storage {
  ref(key: string): Object;
  refFromURL(key: string): Object;
}

type Firebase$UserInfo = {
  photoURL: ?string,
  email: ?string,
  displayName: ?string,
  uid: string,
  providerId: string
};

type Firebase$User = {
  photoURL: ?string,
  email: ?string,
  displayName: ?string,
  uid: string,
  providerData: Array<Firebase$UserInfo>,
  getToken(): Promise<string>
};

declare module "firebase" {
  declare export function initializeApp(config: Object): void;
  declare export function database(): Firebase$Database;
  declare export function storage(): Firebase$Storage;
  declare export function auth(): Object;
}