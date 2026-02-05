import basex from 'base-x';
import isBase58 from 'validator/es/lib/isBase58';
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const bs58 = basex(BASE58);

export function decodeBigNumberKey(str: string): number {
  const arr = bs58.decode(str) as Uint8Array;
  const extArr = new Uint8Array([0, 0, ...arr]);

  const view = new DataView(extArr.buffer);
  if (view.buffer.byteLength !== 8) {
    return -1;
  }
  const res = view.getBigUint64(0);
  return Number(res);
}

export function encodeBigNumberKey(key: number | string): string {
  const buffer = new ArrayBuffer(8);

  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(key));
  const arr = new Uint8Array(view.buffer);

  return bs58.encode(arr.slice(2));
}

export function isValidBigNumberKey(str: string): boolean {
  const is_base58 = isBase58(str);
  if (!is_base58) return false;
  const arr = bs58.decode(str) as Uint8Array;
  return arr.length === 6;
}
