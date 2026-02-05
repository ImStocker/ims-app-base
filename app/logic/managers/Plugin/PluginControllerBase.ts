import type { IAppManager } from '../IAppManager';

import type { FieldTypeController } from '../../types/FieldTypeController';
import type { BlockTypeDefinition } from '../../types/BlockTypeDefinition';
import EditorManager from '../EditorManager';
import LocalFsSyncManager, { type SegmentEntity } from '../LocalFsSyncManager';

type PluginContentDescriptorBlockContent = {
  controller: BlockTypeDefinition;
};

type PluginContentDescriptorBlock = PluginContentDescriptorBase<
  'block',
  PluginContentDescriptorBlockContent
>;

type PluginContentDescriptorFieldContent = {
  controller: FieldTypeController;
};

type PluginContentDescriptorField = PluginContentDescriptorBase<
  'field',
  PluginContentDescriptorFieldContent
>;

type PluginContentDescriptorExportSegmentContent = SegmentEntity;

type PluginContentDescriptorExportSegment = PluginContentDescriptorBase<
  'segment',
  PluginContentDescriptorExportSegmentContent
>;

type PluginContentDescriptorModuleContent = {
  activate(appManager: IAppManager): Promise<() => Promise<void>>;
};

type PluginContentDescriptorModule = PluginContentDescriptorBase<
  'module',
  PluginContentDescriptorModuleContent
>;

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

type PluginContentDescriptorBase<TypeName, Content> =
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

export default abstract class PluginControllerBase {
  private _pluginDescriptor: PluginDescriptor;
  private _activated: boolean = false;
  private _activationLock = Promise.resolve();
  protected _deactivateCallbacks: (() => any)[] = [];
  appManager: IAppManager;

  get activated() {
    return this._activated;
  }

  isDev() {
    return false;
  }

  constructor(appManager: IAppManager, pluginDescriptor: PluginDescriptor) {
    this.appManager = appManager;
    this._pluginDescriptor = pluginDescriptor;
  }

  get descriptor() {
    return this._pluginDescriptor;
  }

  private _activateBlock(plugin_content: PluginContentDescriptorBlock) {
    const block = this.appManager
      .get(EditorManager)
      .registerBlockType(plugin_content.content.controller);
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

      const plugin = this.descriptor;
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
