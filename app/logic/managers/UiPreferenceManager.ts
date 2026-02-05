import SyncStoreCore from '../types/SyncStoreCore';
import { AppSubManagerBase, type IAppManager } from './IAppManager';

export default class UiPreferenceManager extends AppSubManagerBase {
  protected _core: SyncStoreCore;

  constructor(appManager: IAppManager) {
    super(appManager);

    this._core = new SyncStoreCore({
      storageGetter: async () =>
        localStorage.getItem('rendererUiPreferences-' + 0),
      storageSetter: async (val) =>
        localStorage.setItem('rendererUiPreferences-' + 0, val),
    });
  }

  async initClient() {
    await this._core.init();
  }

  getPreference<T>(name: string, def: T): T {
    if (!this._core.inited) return def;
    return this._core.getKey(name, def);
  }

  setPreference<T>(name: string, val: T): void {
    if (!this._core.inited) return;
    this._core.setKey(name, val);
  }

  restoreBasicSettings(_selection: string[]) {
    if (!this._core.inited) return;
    return this._core.setAll({});
  }
}
