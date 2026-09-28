import type { AssetPropValue } from '#logic/types/Props';
import { castAssetPropValueToString, makeBlockRef } from '#logic/types/Props';
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import type { ExtractedEntriesForBlock } from '#components/Asset/Editor/extractEntriesForBlock';
import { extractEntriesForBlock } from '#components/Asset/Editor/extractEntriesForBlock';

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
  name?: AssetPropValue;
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
      type: (props.type ?? null) as GalleryBlockItemType | null,
      value: props.value ?? null,
      title: props.title,
      name: props.name,
    };
  });
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

export function getGalleryItemSlotName(
  item: Pick<GalleryBlockItemObject, 'name'> | null | undefined,
): string {
  if (!item) return '';
  return castAssetPropValueToString(item.name) ?? '';
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

/**
 * Задаёт служебное имя слота.
 * Если имя задано, ключ записи должен совпадать с нормализованным именем,
 * поэтому ключ переименовывается. Пустое имя возвращает записи uuid-ключ.
 */
export function setGalleryItemName(
  assetChanger: AssetChanger,
  resolved_block: ResolvedAssetBlock,
  key: string,
  name: string | null,
  new_key: string,
) {
  const op = assetChanger.makeOpId();
  const asset_id = resolved_block.assetId;
  const block_ref = makeBlockRef(resolved_block);
  if (new_key !== key) {
    assetChanger.renameBlockPropKey(
      asset_id,
      block_ref,
      null,
      key,
      new_key,
      op,
    );
  }
  assetChanger.setBlockPropKey(
    asset_id,
    block_ref,
    null,
    `${new_key}\\name`,
    name,
    op,
  );
}

/**
 * Создаёт пустой именованный слот: у записи есть только имя и позиция,
 * ни типа, ни значения. Такой слот отображается плейсхолдером и может быть
 * заполнен позже файлом, ссылкой или из буфера обмена.
 */
export function createGallerySlot(
  assetChanger: AssetChanger,
  resolved_block: ResolvedAssetBlock,
  key: string,
  name: string,
  index: number,
) {
  assetChanger.setBlockPropKeys(
    resolved_block.assetId,
    makeBlockRef(resolved_block),
    null,
    {
      [`${key}\\name`]: name,
      [`${key}\\index`]: index,
    },
  );
}

/**
 * Очищает содержимое слота, не удаляя саму запись: имя и позиция остаются,
 * а тип, значение и подпись удаляются. После очистки слот снова становится
 * пустым и может быть заполнен позже.
 */
export function clearGallerySlot(
  assetChanger: AssetChanger,
  resolved_block: ResolvedAssetBlock,
  key: string,
) {
  assetChanger.deleteBlockPropKeys(
    resolved_block.assetId,
    makeBlockRef(resolved_block),
    null,
    [`${key}\\type`, `${key}\\value`, `${key}\\title`],
  );
}
