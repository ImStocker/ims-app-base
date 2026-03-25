import UiManager from '#logic/managers/UiManager';
import type PluginControllerBase from '#logic/plugin/PluginControllerBase';
import type { PluginDescriptor } from '#logic/plugin/PluginControllerBase';
import PluginControllerInternal from '#logic/plugin/PluginControllerInternal';
import {
  PluginInstalledFrom,
  type PluginInfo,
  type PluginListItemEntity,
} from '#logic/plugin/PluginEntity';
import { ProjectSubContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default class PluginSubContext extends ProjectSubContext {
  protected _installedPlugins = new Map<string, PluginInfo>();
  _destroyed: boolean = false;

  async init() {}

  installPluginFromPath(_path: string, _from: PluginInstalledFrom) {}

  async activateSavedPlugins() {}

  async getPluginsList(): Promise<PluginListItemEntity[]> {
    const res_map = new Map<string, PluginListItemEntity>();

    for (const [plugin_name, plugin] of this._installedPlugins) {
      let res_plugin: PluginListItemEntity;
      try {
        const descriptor = plugin.controller.descriptor;
        assert(descriptor);
        res_plugin = {
          name: plugin_name,
          entity: descriptor,
          from: plugin.installedFrom,
          activated: plugin.controller.activated,
        };
      } catch (err: any) {
        res_plugin = {
          name: plugin_name,
          entity: {
            title: plugin_name,
            name: plugin_name,
            content: [],
            version: '1.0.0',
            api: plugin_name,
          },
          from: plugin.installedFrom,
          activated: false,
          error: err.message,
        };
      }
      res_map.set(plugin.name, res_plugin);
    }

    const res_list = [...res_map.values()];

    res_list.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    return res_list;
  }

  async deletePluginByName(plugin_name: string): Promise<boolean> {
    const plugin = this._installedPlugins.get(plugin_name);
    if (plugin) {
      await this._deactivatePlugin(plugin_name);

      this._installedPlugins.delete(plugin_name);

      return true;
    }
    return false;
  }

  getPluginController(plugin_name: string): PluginControllerBase | undefined {
    const plugin = this._installedPlugins.get(plugin_name);
    return plugin?.controller;
  }

  async activateInternalPlugin(pluginDescriptor: PluginDescriptor) {
    const plugin = this._installedPlugins.get(pluginDescriptor.name);
    if (!plugin) {
      try {
        const plugin = new PluginControllerInternal(
          this.projectContext,
          pluginDescriptor,
        );
        const installed_plugin: PluginInfo = {
          name: pluginDescriptor.name,
          controller: plugin,
          installedFrom: PluginInstalledFrom.INTERNAL,
        };
        this._installedPlugins.set(pluginDescriptor.name, installed_plugin);
        await this._activatePlugin(pluginDescriptor.name);
      } catch (err: any) {
        this.projectContext.appManager
          .get(UiManager)
          .showError(
            `Plugin activation failed for plugin ${pluginDescriptor.name}: ${err.message}`,
          );
      }
    }
  }

  protected async _activatePlugin(plugin_name: string): Promise<void> {
    const plugin = this._installedPlugins.get(plugin_name);
    assert(plugin, `Plugin ${plugin_name} is not registered`);

    await plugin.controller.activate();
  }

  protected async _deactivatePlugin(plugin_name: string): Promise<boolean> {
    try {
      const plugin = this._installedPlugins.get(plugin_name);
      if (!plugin) return false;
      return await plugin.controller.deactivate();
    } catch (err: any) {
      this.projectContext.appManager
        .get(UiManager)
        .showError(`Plugin deactivated ${plugin_name}: ${err.message}`);
      return false;
    }
  }

  async destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
  }
}
