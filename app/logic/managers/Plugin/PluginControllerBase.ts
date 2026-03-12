import { convertTranslatedTitle } from '../../utils/assets';
import EditorManager from '../EditorManager';
import type { IAppManager } from '../IAppManager';
import LocalFsSyncManager from '../LocalFsSyncManager';
import UiManager from '../UiManager';
import type {
  PluginContentDescriptorBlock,
  PluginContentDescriptorExportSegment,
  PluginContentDescriptorField,
  PluginContentDescriptorModule,
} from './PluginControllerInternal';

export type PluginContentDescriptor =
  | PluginContentDescriptorBlock
  | PluginContentDescriptorExportSegment
  | PluginContentDescriptorField
  | PluginContentDescriptorModule;

export type PluginDescriptorLocale = {
  [lang: string]: {
    [key: string]: any;
  };
};

export type PluginDescriptor = WithPluginDescriptorLocale & {
  title: string;
  name: string;
  authors?: string;
  content: PluginContentDescriptor[];
  icon?: string;
  version: string;
  website?: string | null;
  api: string;
  description?: string;
  tags?: string[];
};

export type PluginContentDescriptorBase<TypeName, Content> =
  WithPluginDescriptorLocale & {
    type: TypeName;
    name?: string;
    title?: string;
    description?: string;
    icon?: string;
    content: Content;
  };

type WithPluginDescriptorLocale = {
  locale?: PluginDescriptorLocale;
};

export function convertTranslatedPluginTitle(
  title: string,
  appManager: IAppManager,
  locale: PluginDescriptorLocale | null,
) {
  return convertTranslatedTitle(title, (key: string, params?: any) => {
    const current_lang = appManager.get(UiManager).getLanguage();
    if (key === 'localeName') {
      return current_lang;
    }
    if (!locale) {
      return appManager.$t(key, params);
    }

    const title_key = key.substring('translatedTitles.'.length);

    const locales_for_search: PluginDescriptorLocale[] = [
      locale[current_lang],
      locale['en'],
      ...Object.values(locale).filter(
        (locale) => locale !== locale[current_lang] && locale !== locale['en'],
      ),
    ];

    let res_title;
    for (const locale_obj of locales_for_search) {
      const val = getObjectValueByPath(locale_obj, title_key);
      if (val !== undefined && typeof val === 'string') {
        res_title = val;
        break;
      }
    }

    if (res_title === undefined) {
      res_title = appManager.$t(key, params);
    }
    return res_title;
  });
}

function getObjectValueByPath<T extends Record<string, any>>(
  obj: T,
  path: string,
) {
  if (!obj || typeof obj !== 'object') return undefined;

  return path.split('.').reduce<T>((o, key) => {
    if (!o) return undefined;
    return o[key];
  }, obj);
}

export default abstract class PluginControllerBase {
  protected _pluginDescriptor: PluginDescriptor | null = null;
  protected _activated: boolean = false;
  protected _activationLock = Promise.resolve();
  protected _deactivateCallbacks: (() => any)[] = [];
  appManager: IAppManager;

  get activated() {
    return this._activated;
  }

  get descriptor() {
    return this._pluginDescriptor;
  }

  isDev() {
    return false;
  }

  async load(): Promise<void> {}

  constructor(appManager: IAppManager) {
    this.appManager = appManager;
  }

  private _activateBlock(plugin_content: PluginContentDescriptorBlock) {
    const block = this.appManager
      .get(EditorManager)
      .registerBlockType(plugin_content.content.definition);
    this._deactivateCallbacks.push(block.cancel);
  }

  private _activateField(plugin_content: PluginContentDescriptorField) {
    const field = this.appManager
      .get(EditorManager)
      .registerFieldType(plugin_content.content.controller);
    this._deactivateCallbacks.push(field.cancel);
  }

  private _activateExportSegment(
    plugin_content: PluginContentDescriptorExportSegment,
  ) {
    const segment = this.appManager
      .get(LocalFsSyncManager)
      .registerSegment(plugin_content.content);
    this._deactivateCallbacks.push(segment.cancel);
  }

  private async _activateModule(plugin_content: PluginContentDescriptorModule) {
    const cancel = await plugin_content.content.activate(this.appManager);
    this._deactivateCallbacks.push(cancel);
  }

  async activate(): Promise<boolean> {
    const promise = this._activationLock.then(async () => {
      if (this._activated) return false;

      const plugin = this._pluginDescriptor;
      if (!plugin) return false;
      for (const plugin_content of plugin.content) {
        switch (plugin_content.type) {
          case 'block':
            this._activateBlock(plugin_content);
            break;
          case 'field':
            this._activateField(plugin_content);
            break;
          case 'segment':
            this._activateExportSegment(plugin_content);
            break;
          case 'module':
            this._activateModule(plugin_content);
            break;
        }
      }

      this._activated = true;
      return true;
    });
    this._activationLock = promise.then(null, () => {});
    return await promise;
  }

  async deactivate(): Promise<boolean> {
    const promise = this._activationLock.then(async () => {
      if (!this._activated) return false;

      for (const callback of this._deactivateCallbacks) {
        await callback();
      }
      this._deactivateCallbacks = [];
      this._activated = false;
      return true;
    });
    this._activationLock = promise.then(null, () => {});
    return await promise;
  }

  async reactivate(): Promise<boolean> {
    await this.deactivate();
    return await this.activate();
  }
}
