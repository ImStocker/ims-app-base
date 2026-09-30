import type { AssetPropValue, AssetPropValueFile } from '#logic/types/Props';
import {
  castAssetPropValueToFloat,
  castAssetPropValueToString,
  convertAssetPropsToPlainObject,
  encodeAssetPropPartWithCapitals,
  normalizeAssetPropPart,
} from '#logic/types/Props';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import type { ExtractedEntriesForBlock } from '#components/Asset/Editor/extractEntriesForBlock';

export type GalleryBlockItemType =
  | 'file'
  | 'youtube'
  | 'extimage'
  | 'extvideo'
  | 'rutube'
  | 'vkvideo';

export type GalleryBlockItemObject = {
  key: string;
  type: GalleryBlockItemType | null;
  value: AssetPropValue | null;
  title?: AssetPropValue;
  name?: string;
  inherited: boolean;
  index: number;
};

export type GalleryBlockExtractedEntries =
  ExtractedEntriesForBlock<GalleryBlockItemObject>;

export function extractGalleryBlockEntries(
  block: ResolvedAssetBlock,
): GalleryBlockExtractedEntries {
  const plain = convertAssetPropsToPlainObject<Record<string, any>>(
    block.computed,
  );

  const slots = plain.__slots ? plain.__slots : {};

  const map: { [key: string]: GalleryBlockItemObject } = {};
  const list: GalleryBlockItemObject[] = [];
  let maxIndex = 0;

  const inherited_plain = block.inherited
    ? convertAssetPropsToPlainObject(block.inherited)
    : null;

  for (const [key, entry] of Object.entries(plain)) {
    if (key === '__slots' || key[0] === '~') continue;

    const meta = slots[key];

    const prop_inherited =
      !!inherited_plain && inherited_plain.hasOwnProperty(key);
    const index =
      castAssetPropValueToFloat(meta?.index) ??
      castAssetPropValueToFloat(entry?.index) ??
      0;

    const res: GalleryBlockItemObject = {
      key,
      index,
      inherited: prop_inherited,
      name: meta?.name ?? entry?.name,
      title: entry?.title,
      value: entry?.value ?? null,
      type: entry?.type ?? null,
    };

    list.push(res);
    map[key] = res;
    if (maxIndex < index) {
      maxIndex = index;
    }
  }

  list.sort((a, b) => a.index - b.index);
  return {
    maxIndex,
    list,
    map,
  };
}

export function isGalleryItemEmpty(
  item: Pick<GalleryBlockItemObject, 'type' | 'value'> | null | undefined,
): boolean {
  if (!item) return true;
  return !item.type || !item.value;
}

export function isGalleryItemSlot(
  item: Pick<GalleryBlockItemObject, 'name'> | null | undefined,
): boolean {
  if (!item) return false;
  return !!castAssetPropValueToString(item.name);
}

export function getGalleryItemKey(
  type: GalleryBlockItemType,
  value: AssetPropValue,
): string {
  if (type === 'file') {
    return (value as AssetPropValueFile).FileId;
  }
  const val = castAssetPropValueToString(value);

  return type === 'extimage'
    ? normalizeAssetPropPart(val)
    : encodeAssetPropPartWithCapitals(val);
}
