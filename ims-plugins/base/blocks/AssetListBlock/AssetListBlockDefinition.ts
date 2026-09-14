import type { IAppManager } from '#logic/managers/IAppManager';
import type {
  AssetLocalizableField,
  ResolvedAssetBlock,
} from '#logic/utils/assets';
import type { AssetFullInstanceR } from '#logic/types/AssetFullInstance';
import {
  BlockTypeDefinition,
  type BlockMenuExtraItemsParams,
  type BlockProvidedVariable,
} from '#logic/types/BlockTypeDefinition';
import type { MenuListItem } from '#logic/types/MenuList';
import { AssetRights } from '#logic/types/Rights';
import { AssetPropType, type AssetProps } from '#logic/types/Props';
import { capitalizeFirstLetter } from '#logic/utils/stringUtils';

export class AssetListBlockDefinition extends BlockTypeDefinition {
  name = 'assetList';
  component = async () => (await import('./AssetListBlock.vue')).default;
  icon = 'ri-list-check-3';
  override group = 'data';
  override index = 11;

  override focusOnAdded = true;

  override aiSpec = {
    brief:
      'Renders a list of linked assets (elements) as visual box slots. Each slot holds one asset; click or drop to set; configured via Type and Condition settings.',
  };

  override async beforeBlockCreate(
    _appManager: IAppManager,
    params: { title: string | null; existingNames?: string[] },
  ): Promise<
    | { title: string | null; name?: string | null; props?: AssetProps }
    | undefined
  > {
    const existing_names = new Set(params.existingNames ?? []);
    let name = 'assetList';
    let i = 1;
    while (existing_names.has(name)) {
      name = `assetList${i}`;
      i++;
    }
    const title = params.title ?? capitalizeFirstLetter(name);
    return {
      title,
      name,
      props: {
        value: null,
        __type: null,
        __condition: null,
      },
    };
  }

  override getBlockProvidedVariables(
    _asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
    _app_manager: IAppManager,
  ): BlockProvidedVariable[] {
    if (!resolved_block.name && !resolved_block.title) return [];
    return [
      {
        field: {
          index: 0,
          propKey: 'value',
          propTitle:
            resolved_block.title ?? resolved_block.name ?? 'Asset list',
          propName: resolved_block.name ?? undefined,
          type: 'gddElementSelector',
          multiple: true,
          params: {},
          differentDefinition: false,
          hint: null,
        },
        blockId: resolved_block.id,
        blockName: resolved_block.name,
        dataType: [
          { Type: AssetPropType.ARRAY, Of: { Type: AssetPropType.ASSET } },
        ],
        name: resolved_block.name
          ? resolved_block.name
          : (resolved_block.title ?? ''),
        title: resolved_block.title
          ? resolved_block.title
          : (resolved_block.name ?? ''),
      },
    ];
  }

  override getBlockLocalizableFields(): AssetLocalizableField[] {
    return [];
  }

  override getBlockMenuExtraItems(
    appManager: IAppManager,
    params: BlockMenuExtraItemsParams,
  ): MenuListItem[] {
    if (params.displayMode !== 'normal') return [];
    if (params.resolvedBlock.rights !== AssetRights.FULL_ACCESS) return [];
    return [
      {
        title: appManager.$t('assetEditor.changeSettings'),
        icon: 'ri-settings-3-line',
        action: () => params.invokeBlock('openSettings'),
      },
    ];
  }
}
