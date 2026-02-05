import { assert } from '../utils/typeUtils';

type EntityCacheT<
  PropertyName extends string,
  KeyType extends string | number,
> = { [P in PropertyName]: KeyType };

type EntityCacheRecord<
  T extends EntityCacheT<Key, KeyType>,
  Key extends string = 'id',
  KeyType extends string | number = string,
> = {
  value: T | null;
  updatedAt: number;
};

type EntityCacheRequest<
  T extends EntityCacheT<Key, KeyType>,
  Key extends string = 'id',
  KeyType extends string | number = string,
> = {
  resolve: (a: T | null) => void;
  reject: (e: Error) => void;
  promise: Promise<T | null>;
};

export class EntityCache<
  T extends EntityCacheT<Key, KeyType>,
  Key extends string = 'id',
  KeyType extends string | number = string,
> {
  private _requests = new Map<KeyType, EntityCacheRequest<T, Key, KeyType>>();
  private _requestTimer: NodeJS.Timeout | null = null;
  private _cache = new Map<KeyType, EntityCacheRecord<T, Key, KeyType>>();
  private _key: Key;
  private _loadFunc: (keys: KeyType[]) => Promise<T[]>;
  ttl: number;

  constructor({
    ttl,
    key,
    loadFunc,
  }: {
    ttl: number;
    key: Key;
    loadFunc: (keys: KeyType[]) => Promise<T[]>;
  }) {
    this.ttl = ttl;
    this._key = key;
    this._loadFunc = loadFunc;
  }

  clear() {
    this._cache.clear();
  }

  reset() {
    this.clear();
    if (this._requestTimer) {
      clearTimeout(this._requestTimer);
      this._requestTimer = null;
    }
    for (const [_assetId, req] of Object.entries(this._requests)) {
      req.reject(new Error('Cache was reset'));
    }
    this._requests = new Map<KeyType, EntityCacheRequest<T, Key, KeyType>>();
  }

  touchInCache(key: KeyType) {
    const exist = this._cache.get(key);
    if (exist) {
      exist.updatedAt = Date.now();
      const req = this._requests.get(key);
      if (req) {
        req.resolve(exist.value);
        this._requests.delete(key);
      }
    }
  }

  addToCache(element: T) {
    const req = this._requests.get(element[this._key]);
    if (req) {
      req.resolve(element);
      this._requests.delete(element[this._key]);
    }
    this._cache.set(element[this._key], {
      value: element,
      updatedAt: Date.now(),
    });
  }

  addToCacheMany(elements: Iterable<T>) {
    for (const element of elements) {
      this.addToCache(element);
    }
  }

  // Может выдать уже просроченные значения
  getElementSync(key: KeyType, checkValid = false): T | null | undefined {
    const now = Date.now();
    const exist = this._cache.get(key);
    if (exist && (!checkValid || exist.updatedAt > now - this.ttl)) {
      return exist.value;
    }
    return undefined;
  }

  findElementSync(
    cond: (element: T) => boolean,
    checkValid = true,
  ): T | undefined {
    const now = Date.now();
    for (const [_key, val] of this._cache) {
      if (!checkValid || val.updatedAt > now - this.ttl) {
        if (val.value !== null && cond(val.value)) {
          return val.value;
        }
      }
    }
    return undefined;
  }

  isValidCache(key: KeyType): boolean {
    const exist = this._cache.get(key);
    if (exist) {
      return exist.updatedAt > Date.now() - this.ttl;
    }
    return false;
  }

  getElementTime(key: KeyType): number | undefined {
    const exist = this._cache.get(key);
    if (exist) {
      return exist.updatedAt;
    }
    return undefined;
  }

  invalidateElement(key: KeyType) {
    this._cache.delete(key);
  }

  setNotFoundKeys(keys: KeyType[]) {
    const updatedAt = Date.now();
    for (const key of keys) {
      this._cache.set(key, {
        updatedAt,
        value: null,
      });
    }
  }

  async getElement(key: KeyType): Promise<T | null> {
    const exist = this.getElementSync(key);
    if (exist !== undefined && this.isValidCache(key)) {
      return exist;
    }

    const req = this._requests.get(key);
    if (req) return req.promise;

    let resolve: (res: T | null) => void;
    let reject: (err: Error) => void;
    const promise = new Promise<T | null>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // @ts-expect-error: resolve is set
    assert(resolve);
    // @ts-expect-error: resolve is set
    assert(reject);

    this._requests.set(key, {
      resolve,
      reject,
      promise,
    });

    if (!this._requestTimer) {
      this._requestTimer = setTimeout(async () => {
        this._requestTimer = null;
        const keys = [...this._requests.keys()];
        if (keys.length > 0) {
          try {
            const res = await this._loadFunc(keys);
            const res_map = new Map<string | number, T>(
              res.map((x) => {
                return [x[this._key], x];
              }),
            );
            // Mark not found:
            for (const id of keys) {
              if (!res_map.has(id)) {
                this._cache.set(id, {
                  updatedAt: Date.now(),
                  value: null,
                });
                const req = this._requests.get(id);
                if (req) {
                  req.resolve(null);
                  this._requests.delete(id);
                }
              }
            }
          } catch (err: any) {
            for (const id of keys) {
              const req = this._requests.get(id);
              if (req) {
                req.reject(err);
                this._requests.delete(id);
              }
            }
          }
        }
      }, 100);
    }

    return promise;
  }

  *entries(valid = true) {
    for (const entry of this._cache.values()) {
      if (!valid || entry.updatedAt > Date.now() - this.ttl) {
        yield entry;
      }
    }
  }

  getAllElements(valid = true): T[] {
    const res: T[] = [];
    for (const entry of this.entries(valid)) {
      if (entry.value) {
        res.push(entry.value);
      }
    }
    return res;
  }
}
