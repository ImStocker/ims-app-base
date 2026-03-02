import { toRef, watch } from 'vue';
import type PluginControllerExternal from '../managers/Plugin/PluginControllerExternal';
import type { ResolvedAssetBlock } from '../utils/assets';
import type { AssetChanger } from './AssetChanger';
import { BlockTypeDefinition } from './BlockTypeDefinition';
import {
  assignPlainValueToAssetProps,
  extractSubObjectAsPlainValue,
  makeBlockRef,
  type AssetPropsPlainObjectValue,
} from './Props';

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

  async componentApi(
    assetChanger: AssetChanger,
    resolvedBlock: ResolvedAssetBlock,
  ) {
    debugger;
    const api: ExternalPluginComponentApi = {
      onMounted: null,
      onUnmounted: null,
      testValue: resolvedBlock.computed,
    };

    watch(
      () => resolvedBlock.computed,
      () => {
        console.log('тут');
      },
      { deep: true },
    );

    const block = {
      makeChangeOp() {
        return assetChanger.makeOpId();
      },
      getProp<T extends AssetPropsPlainObjectValue>(key: string): T {
        return extractSubObjectAsPlainValue(resolvedBlock.computed, key);
      },
      deleteProp(key: string, opId?: number): void {},
      changeProp(
        key: string,
        value: AssetPropsPlainObjectValue,
        opId?: number,
      ) {
        const prepared_value = assignPlainValueToAssetProps({}, value, key);
        assetChanger.setBlockPropKeys(
          resolvedBlock.assetId,
          makeBlockRef(resolvedBlock),
          null,
          prepared_value,
          opId,
        );
      },
      watchProp(
        key: string,
        callback: (
          oldValue: AssetPropsPlainObjectValue,
          newValue: AssetPropsPlainObjectValue,
        ) => void,
      ) {},

      // getProps<T extends AssetPropsPlainObjectValue>(key: string = ''): T {},
      // changeProps(
      //   value: AssetPropsPlainObjectValue,
      //   key: string = '',
      //   opId?: number,
      // ) {
      //   assetChanger.setBlockPropKeys();
      // },
      // deleteProps(keys: string[], opId?: number) {},
      // watchProps(
      //   callback: (
      //     oldValue: AssetPropsPlainObjectValue,
      //     newValue: AssetPropsPlainObjectValue,
      //   ) => void,
      //   key: string = '',
      // ) {},
    };

    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;

    const func = new AsyncFunction(
      'onMounted',
      'onUnmounted',
      'block',
      'pluginApi',
      this.componentCode,
    );

    await func(
      (callback) => (api.onMounted = callback),
      (callback) => (api.onUnmounted = callback),
      block,
      this.pluginController.getPublicPluginApi(),
    );

    return api;
  }
}
