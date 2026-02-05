import {
  type AssetPropValue,
  type AssetPropValueAsset,
  castAssetPropValueToBoolean,
} from '#logic/types/Props';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import {
  type ExtractedEntriesForBlock,
  extractEntriesForBlock,
} from '#components/Asset/Editor/extractEntriesForBlock';

export type ChecklistBlockItemObject = {
  key: string;
  title: AssetPropValue;
  checked: boolean;
  task: AssetPropValueAsset | null;
  inherited: boolean;
  index: number;
};

export type ChecklistBlockExtractedEntries =
  ExtractedEntriesForBlock<ChecklistBlockItemObject>;

export function extractChecklistBlockEntries(
  block: ResolvedAssetBlock,
): ChecklistBlockExtractedEntries {
  return extractEntriesForBlock(block, (props, base_entry) => {
    return {
      ...base_entry,
      checked: castAssetPropValueToBoolean(props.checked),
      task: props.task && props.task.AssetId ? props.task : null,
      title: props.title,
    };
  });
}
