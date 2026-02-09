import * as Vue from 'vue';

import {
  type IAppManager,
  AppSubManagerBase,
  type IAppSubManagerCtr,
  type IAppSubManager,
  type AppManagerContext,
} from './IAppManager';
import { assert } from '../utils/typeUtils';
import type { VueI18n } from 'vue-i18n';
import type { BaseAppConfiguration } from '../configurations/base-app-configuration';
import type { Router } from 'vue-router';

type StateRoutine = {
  key: string;
  save: () => Record<string, any>;
  load: (state: Record<string, any>) => void;
};

export default class AppManager implements IAppManager {
  public readonly $appConfiguration: BaseAppConfiguration;
  private _inited: boolean;
  private readonly _subManagers: Map<any, AppSubManagerBase>;
  private readonly _initRoutines: (() => Promise<void>)[];
  private readonly _postInitRoutines: (() => Promise<void>)[];
  private readonly _destroyRoutines: (() => Promise<void>)[];
  private readonly _stateRoutines: StateRoutine[] = [];
  private readonly _runWithContext: <T extends () => any>(
    fn: T,
  ) => ReturnType<T> | Promise<Awaited<ReturnType<T>>>;

  private _loadedStateDelayed: Record<string, any> | null = null;

  $i18n: VueI18n;
  $router: Router;
  $env: Record<string, string>;

  constructor(
    { $i18n, $router, $env, runWithContext }: AppManagerContext,
    $appConfiguration: BaseAppConfiguration,
  ) {
    this._inited = false;
    this._initRoutines = [];
    this._postInitRoutines = [];
    this._destroyRoutines = [];
    this.$i18n = $i18n;
    this.$router = $router;
    this.$env = $env;
    this.$appConfiguration = $appConfiguration;
    this._runWithContext = runWithContext;

    this._subManagers = new Map<any, AppSubManagerBase>();
  }

  saveState(): Record<string, any> {
    const res = {};
    for (const routine of this._stateRoutines) {
      res[routine.key] = routine.save();
    }
    return res;
  }

  loadState(state: Record<string, any>) {
    if (this._inited) {
      for (const routine of this._stateRoutines) {
        routine.load(
          state.hasOwnProperty(routine.key) ? state[routine.key] : {},
        );
      }
    } else this._loadedStateDelayed = state;
  }

  runWithContext<T extends () => any>(
    fn: T,
  ): ReturnType<T> | Promise<Awaited<ReturnType<T>>> {
    return this._runWithContext(fn);
  }

  getRouter(): Router {
    return this.$router as unknown as Router;
  }

  get<R extends T, T extends AppSubManagerBase = AppSubManagerBase>(
    manager_interface: IAppSubManagerCtr<T>,
  ): R;

  get<R extends T, T extends IAppSubManager = AppSubManagerBase>(
    manager_interface: IAppSubManagerCtr<T>,
  ): R {
    const manager_id = manager_interface;
    const sub_manager = this._subManagers.get(manager_id);
    if (!sub_manager)
      throw new Error(
        `Sub manager "${manager_id.name ? manager_id.name : manager_id}" isn't registered`,
      );
    return sub_manager as unknown as R;
  }

  register<T extends AppSubManagerBase>(
    manager_interface: IAppSubManagerCtr<T>,
    manager: T,
  ): void;
  register<T extends AppSubManagerBase>(manager: T): void;

  register<T extends AppSubManagerBase>(
    manager_interface: IAppSubManagerCtr<T> | T,
    manager?: T,
  ): void {
    let manager_id;
    if (manager_interface instanceof AppSubManagerBase) {
      manager_id = manager_interface.constructor;
      manager = manager_interface;
    } else manager_id = manager_interface;
    assert(manager, 'Manager is undefined');
    this._subManagers.set(
      manager_id,
      Vue.reactive(manager) as unknown as AppSubManagerBase,
    );
  }

  addInitRoutine(init: () => Promise<void>) {
    this._initRoutines.push(init);
  }

  addPostInitRoutine(init: () => Promise<void>) {
    this._postInitRoutines.push(init);
  }

  addDestroyRoutine(destroy: () => Promise<void>) {
    this._destroyRoutines.push(destroy);
  }

  addStateRoutine(routine: StateRoutine) {
    this._stateRoutines.push(routine);
  }

  async init() {
    if (this._inited) {
      return;
    }

    for (const init of this._initRoutines) {
      await init();
    }

    this._runPostInit();

    this._inited = true;

    if (this._loadedStateDelayed) {
      this.loadState(this._loadedStateDelayed);
      this._loadedStateDelayed = null;
    }
  }

  private _runPostInit() {
    // NOTE: no await
    for (const post_init of this._postInitRoutines) {
      Promise.resolve()
        .then(() => {
          return post_init();
        })
        .then(null, (err: any) => {
          console.error('AppManager::postInit', err);
        });
    }
  }

  resetInit() {
    this._inited = false;
  }

  async destroy() {
    if (!this._inited) {
      return;
    }

    for (const destroy of this._destroyRoutines) {
      await destroy();
    }

    this._inited = false;
  }

  async resetApp() {
    await this.destroy();
    window.location.reload();
  }

  $t(key: string, params?: any): string {
    return this.$i18n.t(key, params) as string;
  }
}
