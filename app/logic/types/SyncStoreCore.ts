type SyncStoreCoreStorageGetter = () => Promise<any>;
type SyncStoreCoreStorageSetter = (obj: any) => Promise<void>;

export function timerPromise(delay: any, val = undefined) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(val);
    }, delay);
  });
}

export default class SyncStoreCore {
  storageGetter: SyncStoreCoreStorageGetter;
  storageSetter: SyncStoreCoreStorageSetter;
  saveDelay: number;
  private _data: any;
  private _setTask: Promise<void> | null;
  private _inited: boolean;

  constructor({
    storageGetter,
    storageSetter,
    saveDelay = 1000,
  }: {
    storageGetter: SyncStoreCoreStorageGetter;
    storageSetter: SyncStoreCoreStorageSetter;
    saveDelay?: number;
  }) {
    this.storageGetter = storageGetter;
    this.storageSetter = storageSetter;
    this.saveDelay = saveDelay;
    this._data = null;
    this._setTask = null;
    this._inited = false;
  }

  get inited() {
    return this._inited;
  }

  async init(force = false) {
    if (!this._data || force) {
      try {
        const preferences_json = await this.storageGetter();
        if (preferences_json) this._data = JSON.parse(preferences_json);
        else this._data = {};
      } catch (err) {
        console.error(err);
        this._data = {};
      }
      this._inited = true;
    }
  }

  getAll() {
    if (!this._inited)
      throw new Error('SyncStoreCore: Trying to getAll before init');
    return this._data;
  }

  setAll(obj: any) {
    if (!this._inited)
      throw new Error('SyncStoreCore: Trying to setAll before init');
    this._data = obj;
    if (!this._setTask) {
      this._setTask = timerPromise(this.saveDelay)
        .then(() => {
          try {
            const pref_string = JSON.stringify(this._data);
            return this.storageSetter(pref_string);
          } catch (err) {
            console.error(err);
            // Ошибка записи -> значит сохраняется неверный объект - откатить
            return this.init(true);
          }
        })
        .then(
          () => {
            this._setTask = null;
          },
          () => {
            this._setTask = null;
          },
        );
    }
  }

  getKey<T>(name: string, def: T): T;
  getKey<T>(name: string): T | undefined;

  getKey<T>(name: string, def?: T): T | undefined {
    if (!this._inited)
      throw new Error('SyncStoreCore: Trying to getKey before init');
    if (!this._data || this._data[name] === undefined) {
      return def;
    }
    return this._data[name];
  }

  setKey<T>(name: string, val: T) {
    if (!this._inited)
      throw new Error('SyncStoreCore: Trying to setKey before init');
    this.setAll({
      ...(this._data ? this._data : {}),
      [name]: val,
    });
  }

  async awaitSave() {
    if (this._setTask) {
      await this._setTask;
    }
  }
}
