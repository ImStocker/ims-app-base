import EditorManager from '#logic/managers/EditorManager';
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
import type { PropsFormFieldDef } from '#logic/types/PropsForm';
import {
  castAssetPropValueToString,
  extractSubObjectAsPlainValue,
  type AssetProps,
} from '#logic/types/Props';
import { getSyncedAssetBlockTitleFromName } from '#logic/utils/stringUtils';

function extractPropField(block: ResolvedAssetBlock): PropsFormFieldDef {
  const props = block.props ?? {};
  return {
    index: 0,
    propKey: 'value',
    propTitle: block.title ?? block.name ?? 'Variable',
    propName: block.name ?? undefined,
    type: props.__type ? castAssetPropValueToString(props.__type) : 'text',
    multiple: false,
    params: extractSubObjectAsPlainValue<AssetProps>(props, '__params') ?? {},
    differentDefinition: false,
    hint: props.__hint ?? null,
  };
}

export class PropBlockDefinition extends BlockTypeDefinition {
  name = 'prop';
  component = async () => (await import('./PropBlock.vue')).default;
  icon = 'ri-price-tag-3-line';
  override group = null;
  override index = 2;
  override hideBlockHeader = true;
  override focusOnAdded = true;

  override async beforeBlockCreate(
    _appManager: IAppManager,
    params: { title: string | null; existingNames?: string[] },
  ): Promise<
    | { title: string | null; name?: string | null; props?: AssetProps }
    | undefined
  > {
    const existing_names = new Set(params.existingNames ?? []);
    let name = 'property';
    let i = 1;
    while (existing_names.has(name)) {
      name = `property${i}`;
      i++;
    }
    const title = params.title ?? getSyncedAssetBlockTitleFromName(name);
    return {
      title,
      name,
      props: {
        value: null,
        __type: null,
      },
    };
  }

  override getBlockProvidedVariables(
    asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
    app_manager: IAppManager,
  ): BlockProvidedVariable[] {
    if (!resolved_block.name && !resolved_block.title) return [];
    const field = extractPropField(resolved_block);
    const field_controller = field.type
      ? app_manager.get(EditorManager).getFieldTypesMap()[field.type]
      : undefined;

    return [
      {
        field,
        blockId: resolved_block.id,
        blockName: resolved_block.name,
        dataType: field_controller?.dataTypes ?? [],
        name: resolved_block.name
          ? resolved_block.name
          : (resolved_block.title ?? ''),
        title: resolved_block.title
          ? resolved_block.title
          : (resolved_block.name ?? ''),
      },
    ];
  }

  override getBlockLocalizableFields(
    _asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
  ): AssetLocalizableField[] {
    const field = extractPropField(resolved_block);
    if (field.type !== 'text' && field.type !== 'string') return [];
    return [
      {
        propKey: 'value',
        localeKey: 'value',
        title: resolved_block.title ?? resolved_block.name ?? 'Variable',
        type: field.type,
      },
    ];
  }

  override getBlockMenuExtraItems(
    appManager: IAppManager,
    params: BlockMenuExtraItemsParams,
  ): MenuListItem[] {
    if (params.displayMode !== 'normal') {
      return [];
    }
    if (params.resolvedBlock.rights !== AssetRights.FULL_ACCESS) {
      return [];
    }
    return [
      {
        title: appManager.$t('assetEditor.changeSettings'),
        icon: 'ri-settings-3-line',
        action: () => params.invokeBlock('openSettings'),
      },
    ];
  }
}
