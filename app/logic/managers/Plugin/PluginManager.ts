import { AppSubManagerBase } from '../IAppManager';
import type { PluginListItemEntity, PluginInfo } from './PluginEntity';
import UiManager from '../UiManager';
import PluginController from './PluginController';
import { assert } from '../../utils/typeUtils';
import type { PluginDescriptor } from './PluginControllerBase';

export default class PluginManager extends AppSubManagerBase {
  private _installedPlugins = new Map<string, PluginInfo>();
  _destroyed: boolean = false;

  async init() {}

  async getPluginsList(): Promise<PluginListItemEntity[]> {
    const res_map = new Map<string, PluginListItemEntity>();

    for (const [plugin_name, plugin] of this._installedPlugins) {
      let res_plugin: PluginListItemEntity;
      try {
        const descriptor = plugin.controller.descriptor;
        res_plugin = {
          name: plugin_name,
          entity: descriptor,
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

  async deletePluginByName(plugin_name: string) {
    const plugin = this._installedPlugins.get(plugin_name);
    if (plugin) {
      try {
        await this._deactivatePlugin(plugin_name);
      } catch (err) {
        console.error(
          'PluginManager::deletePluginByName',
          'cannot deactivate plugin',
          plugin_name,
          err,
        );
      }

      this._installedPlugins.delete(plugin_name);
    }
  }

  getPluginController(plugin_name: string) {
    const plugin = this._installedPlugins.get(plugin_name);
    return plugin?.controller;
  }

  async activatePlugin(pluginDescriptor: PluginDescriptor) {
    const plugin = this._installedPlugins.get(pluginDescriptor.name);
    if (!plugin) {
      try {
        const plugin = new PluginController(this.appManager, pluginDescriptor);
        const installed_plugin = {
          name: pluginDescriptor.name,
          controller: plugin,
        };
        this._installedPlugins.set(pluginDescriptor.name, installed_plugin);
        await this._activatePlugin(pluginDescriptor.name);
      } catch (err) {
        console.error(
          'PluginManager::activatePluginByName',
          'cannot activate plugin',
          pluginDescriptor.name,
          err,
        );
      }
    }
  }

  private async _activatePlugin(plugin_name: string): Promise<void> {
    const plugin = this._installedPlugins.get(plugin_name);
    assert(plugin, `Plugin ${plugin_name} is not registered`);

    await plugin.controller.activate();
  }

  private async _deactivatePlugin(plugin_name: string): Promise<boolean> {
    try {
      const plugin = this._installedPlugins.get(plugin_name);
      if (!plugin) return false;
      return await plugin.controller.deactivate();
    } catch (err: any) {
      this.appManager
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
