import type { PluginDescriptor } from './PluginControllerBase';
import type PluginControllerBase from './PluginControllerBase';

export type PluginSavedDescription = {
  name: string;
  from: PluginInstalledFrom;
  hash: string;
  activated: boolean;
  disabledContent: string[];
  devPluginPath?: string;
  error?: string;
  properties?: Record<string, any>;
}; // Используется при создании и обновлении плагина

export type PluginInfo = {
  name: string;
  // hasUpdates: PluginOnlineDescriptor | null;
  // installedFrom: PluginInstalledFrom;
  controller: PluginControllerBase;
  // hash: string;
  // disabledContent: string[];
};

export enum PluginInstalledFrom {
  LOCAL = 'local',
  ONLINE = 'online',
  DEV = 'dev',
}

export type PluginListItemEntity = {
  name: string;
  entity: PluginDescriptor;
  activated: boolean;
  // hasUpdates: PluginOnlineDescriptor | null;
  // from: PluginInstalledFrom;
  // disabledContent: string[];
  error?: string;
};

export type PluginOnlineDescriptor = PluginDescriptor & {
  hash: string;
};

export type PluginUserEntity = {
  pluginServiceName: string;
  title: string;
  description: string;
  authorsName: string;
  website: string;
};
