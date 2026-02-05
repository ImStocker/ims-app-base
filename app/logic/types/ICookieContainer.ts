export type CookieOptions = {
  expires?: Date;
  path?: string;
  domain?: string;
};

export interface ICookieContainer {
  get(name: string): string;
  set(name: string, value: string, opts?: CookieOptions): void;
  remove(name: string, opts?: CookieOptions): void;
}
