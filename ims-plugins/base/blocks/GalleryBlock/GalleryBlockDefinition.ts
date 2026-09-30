import type { IAppManager } from '#logic/managers/IAppManager';
import type { AssetFullInstanceR } from '#logic/types/AssetFullInstance';
import {
  BlockTypeDefinition,
  type BlockProvidedVariable,
} from '#logic/types/BlockTypeDefinition';
import { AssetPropType, castAssetPropValueToString } from '#logic/types/Props';
import type { AssetPropValueType } from '#logic/types/Props';
import type { PropsFormFieldDef } from '#logic/types/PropsForm';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import { galleryAiSpec } from './GalleryAiSpec';
import {
  extractGalleryBlockEntries,
  isGalleryItemSlot,
  type GalleryBlockItemObject,
} from './GalleryBlock';

function extractGallerySlotField(
  item: GalleryBlockItemObject,
): PropsFormFieldDef {
  const slot_name = item.name;
  return {
    index: item.index,
    propKey: item.key,
    propTitle: castAssetPropValueToString(item.title) || slot_name,
    propName: slot_name,
    type: 'galleryItem',
    multiple: false,
    params: {},
    differentDefinition: false,
    hint: null,
  };
}

function extractGallerySlotDataType(
  item: GalleryBlockItemObject,
): AssetPropValueType[] {
  return item.type === null || item.type === 'file'
    ? [{ Type: AssetPropType.FILE }]
    : [{ Type: AssetPropType.STRING }];
}

export class GalleryBlockDefinition extends BlockTypeDefinition {
  name = 'gallery';
  component = async () => (await import('./GalleryBlock.vue')).default;
  icon = 'gallery-fill';
  override group = 'data';
  override index = 14;
  override aiSpec = galleryAiSpec.aiSpec;

  override getBlockProvidedVariables(
    _asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
    _app_manager: IAppManager,
  ): BlockProvidedVariable[] {
    const res: BlockProvidedVariable[] = [];
    const entries = extractGalleryBlockEntries(resolved_block).list;
    for (const item of entries) {
      if (!isGalleryItemSlot(item)) continue;
      const field = extractGallerySlotField(item);
      res.push({
        field,
        blockId: resolved_block.id,
        blockName: resolved_block.name,
        dataType: extractGallerySlotDataType(item),
        name: field.propName ?? '',
        title: field.propTitle,
        auxiliary: true,
      });
    }
    return res;
  }
}

export { GalleryBlockDefinition as GalleryDefinition };
