import type { BaseAppConfiguration } from './app/logic/configurations/base-app-configuration';
import type { IAppManager } from './app/logic/managers/IAppManager';
import type {
  ComponentCustomOptions as _ComponentCustomOptions,
  ComponentCustomProperties as _ComponentCustomProperties,
} from 'vue';

declare module '#app' {
  interface NuxtApp {
    $getAppManager: () => IAppManager;
    $appConfiguration: BaseAppConfiguration;
    $tTitle: (title: string) => string;
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties extends _ComponentCustomProperties {
    $getAppManager: () => IAppManager;
    $appConfiguration: BaseAppConfiguration;
    $tTitle: (title: string) => string;
  }
  interface ComponentCustomOptions extends _ComponentCustomOptions {}
}
