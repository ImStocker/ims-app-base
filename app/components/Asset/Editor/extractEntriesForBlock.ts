import {
  castAssetPropValueToFloat,
  convertAssetPropsToPlainObject,
} from '../../../logic/types/Props';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';

export type ExtractedEntriesForBlockItem = {
  key: string;
  index: number;
  inherited: boolean;
};

export type ExtractedEntriesForBlock<T extends ExtractedEntriesForBlockItem> = {
  list: T[];
  map: { [key: string]: T };
  maxIndex: number;
};

export function extractEntriesForBlock<T extends ExtractedEntriesForBlockItem>(
  block: ResolvedAssetBlock,
  reader: (
    props: Record<string, any>,
    base_entry: ExtractedEntriesForBlockItem,
  ) => T,
  ignore_keys: string[] = [],
): ExtractedEntriesForBlock<T> {
  let maxIndex = 0;
  let first = true;
  const map: { [key: string]: T } = {};
  const res_list: T[] = [];
  const plain = convertAssetPropsToPlainObject<Record<string, any>>(
    block.computed,
  );
  const inherited_plain = block.inherited
    ? convertAssetPropsToPlainObject(block.inherited)
    : null;
  for (const [key, entry_props] of Object.entries(plain)) {
    if (ignore_keys.includes(key)) {
      continue;
    }
    const index = castAssetPropValueToFloat(entry_props.index) ?? 0;
    const inherited = !!inherited_plain && inherited_plain.hasOwnProperty(key);
    const entry = reader(entry_props, {
      key,
      index,
      inherited,
    });
    res_list.push(entry);
    map[key] = entry;
    if (first || maxIndex < index) {
      maxIndex = index;
    }
    first = false;
  }
  res_list.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  return {
    list: res_list,
    map,
    maxIndex,
  };
}
