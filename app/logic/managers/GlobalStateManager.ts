import { AppSubManagerBase } from './IAppManager';

type GlobalStateEntry<T extends Record<string, any>> = {
  value: T;
  load: (saved: Record<string, any> | null) => T;
  save: (T) => void;
};

export default class GlobalStateManager extends AppSubManagerBase {
  private pendingStates = new Map<string, Record<string, any>>();
  private globalStates = new Map<string, GlobalStateEntry<any>>();

  useGlobalState<T extends Record<string, any>>(
    key: string,
    load: (saved: Record<string, any> | null) => T,
    save: (state: T) => void,
  ): T {
    const exists = this.globalStates.get(key);
    if (exists) return exists.value;
    const pending_state = this.pendingStates.get(key);
    const value = load(pending_state ?? null);
    if (pending_state) this.pendingStates.delete(key);
    this.globalStates.set(key, {
      value,
      load,
      save,
    });
    return value;
  }

  saveState(): Record<string, any> {
    const res_state: Record<string, any> = {};
    for (const [key, state] of this.globalStates.entries()) {
      res_state[key] = state.save(state.value);
    }
    return res_state;
  }

  loadState(state: Record<string, any>) {
    for (const [key, data] of Object.entries(state)) {
      const exists = this.globalStates.get(key);
      if (exists) {
        const loaded = exists.load(data);
        Object.assign(exists.value, loaded);
      } else {
        this.pendingStates.set(key, data);
      }
    }
  }
}
