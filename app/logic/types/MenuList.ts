import type { Component } from 'vue';
import type { LicenseFeatures } from './LicenseFeatures';

export type MenuListItem = {
  title?: string;
  name?: string;
  icon?: string;
  danger?: boolean;
  action?: () => unknown | Promise<unknown>;
  children?: MenuListItem[];
  cssClass?: string;
  type?:
    | 'button'
    | 'loader'
    | 'error'
    | 'separator'
    | 'project_link'
    | 'router_link'
    | Component;
  disabled?: boolean;
  tooltip?: string;
  params?: Record<string, any>;
  proFunction?: keyof LicenseFeatures;
};

export type ExtendedMenuListItem = MenuListItem & {
  isMain?: boolean;
};
