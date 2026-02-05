export type Timer = ReturnType<typeof setTimeout>;

export function forceInt(val: any) {
  return parseInt(val);
}

export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg ? msg : 'Assert fail');
  }
}

export type ChangeFields<T, R> = Omit<T, keyof R> & R;
