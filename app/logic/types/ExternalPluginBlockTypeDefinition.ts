import { BlockTypeDefinition } from './BlockTypeDefinition';

export type ExternalPluginComponentApi = {
  onMounted?: null | ((element: HTMLElement) => void);
  onUnmounted?: null | (() => void);
};

export default abstract class ExternalPluginBlockTypeDefinition extends BlockTypeDefinition {
  override component = () => import('#components/ExternalPluginBlock.vue');
  componentCode: string;

  constructor(componentCode: string) {
    super();
    this.componentCode = componentCode;
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
      this.componentCode,
    );

    await func(
      (callback) => (api.onMounted = callback),
      (callback) => (api.onUnmounted = callback),
    );

    return api;
  }
}
