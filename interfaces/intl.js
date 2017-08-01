declare class Intl$NumberFormat {
  format(number: number): string;
}

declare class Intl {
  static NumberFormat(locale: string, options: Object): Intl$NumberFormat;
}
