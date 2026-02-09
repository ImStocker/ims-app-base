import type { BaseAppConfiguration } from '../configurations/base-app-configuration';
import type { Router } from 'vue-router';
import type { VueI18n } from 'vue-i18n';
import type { ICookieContainer } from '../types/ICookieContainer';

export type AppManagerContext = {
  $i18n: VueI18n;
  $router: Router;
  $cookies: ICookieContainer;
  $env: Record<string, string>;
  runWithContext: <T extends () => any>(
    fn: T,
  ) => ReturnType<T> | Promise<Awaited<ReturnType<T>>>;
};

export interface IAppManager {
  get<R extends T, T extends AppSubManagerBase = AppSubManagerBase>(
    manager_interface: IAppSubManagerCtr<T>,
  ): R;
  register<T extends AppSubManagerBase>(
    manager_interface: IAppSubManagerCtr<T>,
    manager: AppSubManagerBase,
  ): void;

  init(): Promise<void>;
  destroy(): Promise<void>;
  saveState(): Record<string, any>;
  loadState(state: Record<string, any>): void;

  $t(key: string, params?: any): string;
  $appConfiguration: BaseAppConfiguration;
  $env: Record<string, string>;
  getRouter(): Router;
  runWithContext: <T extends () => any>(
    fn: T,
  ) => ReturnType<T> | Promise<Awaited<ReturnType<T>>>;
}

export type IAppSubManagerCtr<T extends IAppSubManager> = abstract new (
  app_manager: IAppManager,
) => T;
export interface IAppSubManager {}

export abstract class AppSubManagerBase implements IAppSubManager {
  protected readonly appManager: IAppManager;

  constructor(app_manager: IAppManager) {
    this.appManager = app_manager;
  }
}
