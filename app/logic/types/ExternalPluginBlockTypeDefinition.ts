import { watch } from 'vue';
import type PluginControllerExternal from '../managers/Plugin/PluginControllerExternal';
import type { ResolvedAssetBlock } from '../utils/assets';
import type { AssetChanger } from './AssetChanger';
import { BlockTypeDefinition } from './BlockTypeDefinition';
import {
  assignPlainValueToAssetProps,
  convertAssetPropsToPlainObject,
  extractAssetPropsSubObject,
  extractSubObjectAsPlainValue,
  makeBlockRef,
  sameAssetPropObjects,
  type AssetProps,
  type AssetPropsPlainObject,
  type AssetPropsPlainObjectValue,
} from './Props';

export type ExternalPluginComponentApi = {
  onMounted?: null | ((element: HTMLElement) => void);
  onUnmounted?: null | (() => void);
};

type OnPropValueChangeCb = (
  newValue: AssetPropsPlainObjectValue,
  oldValue: AssetPropsPlainObjectValue,
) => void;

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
    getResolvedBlock: () => ResolvedAssetBlock,
  ) {
    const api: ExternalPluginComponentApi = {
      onMounted: null,
      onUnmounted: null,
    };

    const prop_watchers = new Map<string, Array<OnPropValueChangeCb>>();

    const resolved_block = getResolvedBlock();

    const on_block_change = (newValue: AssetProps, oldValue: AssetProps) => {
      for (const [key, callbacks] of prop_watchers) {
        const old_asset_props = extractAssetPropsSubObject(oldValue, key);
        const new_asset_props = extractAssetPropsSubObject(newValue, key);

        if (!sameAssetPropObjects(old_asset_props, new_asset_props)) {
          for (const cb of callbacks) {
            cb(
              extractSubObjectAsPlainValue(new_asset_props),
              extractSubObjectAsPlainValue(old_asset_props),
            );
          }
        }
      }
    };

    watch(
      () => getResolvedBlock().computed,
      (newValue, oldValue) => {
        on_block_change(newValue, oldValue);
      },
    );

    const block = {
      makeChangeOp() {
        return assetChanger.makeOpId();
      },
      getProp<T extends AssetPropsPlainObjectValue>(key: string): T {
        return extractSubObjectAsPlainValue(getResolvedBlock().computed, key);
      },
      deleteProp(key: string, opId?: number): void {
        assetChanger.deleteBlockPropKey(
          resolved_block.assetId,
          makeBlockRef(resolved_block),
          null,
          key,
          opId,
        );
      },
      changeProp(
        key: string,
        value: AssetPropsPlainObjectValue,
        opId?: number,
      ) {
        const prepared_value = assignPlainValueToAssetProps({}, value, key);
        assetChanger.setBlockPropKeys(
          resolved_block.assetId,
          makeBlockRef(resolved_block),
          null,
          prepared_value,
          opId,
        );
      },
      watchProp(
        key: string,
        callback: OnPropValueChangeCb,
        options?: {
          immediate: boolean;
        },
      ) {
        if (!prop_watchers.has(key)) {
          prop_watchers.set(key, []);
        }
        prop_watchers.get(key)!.push(callback);

        if (options?.immediate) {
          on_block_change(this.getProps(), {});
        }
      },
      getProps<T extends AssetPropsPlainObject>(keys?: string[]): T {
        if (!keys) {
          return convertAssetPropsToPlainObject(getResolvedBlock().computed);
        }
        const res = {} as Record<string, AssetPropsPlainObjectValue>;
        for (const key of keys) {
          res[key] = extractSubObjectAsPlainValue(
            getResolvedBlock().computed,
            key,
          );
        }
        return res as T;
      },
      changeProps(value: AssetPropsPlainObject, opId?: number) {
        const prepared_value = assignPlainValueToAssetProps({}, value);
        assetChanger.setBlockPropKeys(
          resolved_block.assetId,
          makeBlockRef(resolved_block),
          null,
          prepared_value,
          opId,
        );
      },
      deleteProps(keys: string[], opId?: number) {
        assetChanger.deleteBlockPropKeys(
          resolved_block.assetId,
          makeBlockRef(resolved_block),
          null,
          keys,
          opId,
        );
      },
      watchProps(
        callback: OnPropValueChangeCb,
        keys?: string[],
        options?: {
          immediate: boolean;
        },
      ) {
        if (!keys) {
          this.watchProp('', callback, options);
        } else {
          for (const key of keys) {
            const callback_wrapper = (newV, oldV) => {
              const currentValues = keys.reduce((acc, key) => {
                acc[key] = this.getProp(key);
                return acc;
              }, {});

              callback(
                { ...currentValues, [key]: newV },
                { ...currentValues, [key]: oldV },
              );
            };
            this.watchProp(key, callback_wrapper, options);
          }
        }
      },
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
