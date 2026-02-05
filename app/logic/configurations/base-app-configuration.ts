import type { Component } from 'vue';
import type { IAppManager } from '../managers/IAppManager';

export type ProjectMenuItem = {
  name: string;
  hasAdditionalMenu?: boolean;
  title: string;
  icon: string;
  component: Component;
  props?: Record<string, any>;
  rightsRelatedWorkspaceName?: string;
};

export class BaseAppConfiguration {
  name = '';
  appTitle = 'App';
  saveOnBlockCommit = true;
  isDesktop = false;

  getProjectMenu(_appManager: IAppManager): ProjectMenuItem[] {
    return [];
  }
}
