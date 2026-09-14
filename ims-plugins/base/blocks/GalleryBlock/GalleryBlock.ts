import type { AssetPropValue } from '#logic/types/Props';
import { makeBlockRef } from '#logic/types/Props';
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import type { ExtractedEntriesForBlock } from '#components/Asset/Editor/extractEntriesForBlock';
import { extractEntriesForBlock } from '#components/Asset/Editor/extractEntriesForBlock';

export type GalleryBlockItemObject = {
  key: string;
  type: 'file' | 'youtube' | 'extimage' | 'extvideo' | 'rutube' | 'vkvideo';
  value: AssetPropValue;
  title?: AssetPropValue;
  inherited: boolean;
  index: number;
};

export type GalleryBlockExtractedEntries =
  ExtractedEntriesForBlock<GalleryBlockItemObject>;

export function extractGalleryBlockEntries(
  block: ResolvedAssetBlock,
): GalleryBlockExtractedEntries {
  return extractEntriesForBlock(block, (props, base_entry) => {
    return {
      ...base_entry,
      type: props.type as GalleryBlockItemObject['type'],
      value: props.value,
      title: props.title,
    };
  });
}

export function setGalleryItemCaption(
  assetChanger: AssetChanger,
  resolved_block: ResolvedAssetBlock,
  key: string,
  value: AssetPropValue,
) {
  assetChanger.setBlockPropKeys(
    resolved_block.assetId,
    makeBlockRef(resolved_block),
    null,
    {
      [`${key}\\title`]: value,
    },
  );
}
