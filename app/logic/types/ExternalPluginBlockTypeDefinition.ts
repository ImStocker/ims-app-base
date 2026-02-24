import type PluginControllerExternal from '../managers/Plugin/PluginControllerExternal';
import { BlockTypeDefinition } from './BlockTypeDefinition';

export type ExternalPluginComponentApi = {
  onMounted?: null | ((element: HTMLElement) => void);
  onUnmounted?: null | (() => void);
};

export default abstract class ExternalPluginBlockTypeDefinition extends BlockTypeDefinition {
  override component = () => import('#components/ExternalPluginBlock.vue');
  componentCode: string;
  protected pluginController: PluginControllerExternal;

  constructor(
    componentCode: string,
    pluginController: PluginControllerExternal,
  ) {
    super();
    this.componentCode = componentCode;
    this.pluginController = pluginController;
  }

  async componentApi() {
    const api: ExternalPluginComponentApi = {
      onMounted: null,
      onUnmounted: null,
    };

    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;

    const func = new AsyncFunction(
      'onMounted',
      'onUnmounted',
      'pluginApi',
      this.componentCode,
    );

    await func(
      (callback) => (api.onMounted = callback),
      (callback) => (api.onUnmounted = callback),
      this.pluginController.getPublicPluginApi(),
    );

    return api;
  }
}
