import type {
  AssetBlockParamsDTO,
  AssetChangeContent,
} from '../../types/AssetsType';
import { ENUM_ASSET_ID } from '../../constants';
import {
  castAssetPropValueToString,
  parseAssetNewBlockRef,
  parseChange,
  type AssetProps,
  type AssetPropValue,
} from '../../types/Props';
import type { RefactorChange, RefactorEnumChange } from './refactorTypes';

/** `items\{index}\name` / `items\{index}\title` — поля элемента enum. */
const ENUM_ITEM_FIELD_REGEXP = /^items\\([^\\]+)\\(name|title)$/;
/** `items\{index}` — удаление элемента enum целиком. */
const ENUM_ITEM_DELETE_REGEXP = /^items\\([^\\]+)$/;

/** Ключи `items\*` — внутренности списка значений enum-ассета. */
function isEnumItemKey(key: string): boolean {
  return key === 'items' || key.startsWith('items\\');
}

type SavedBlock = {
  id: string;
  name: string | null;
  type: string;
  props: AssetProps;
};

export type RefactorDetectInput = {
  assetFull: {
    id: string;
    typeIds: string[];
    blocks: SavedBlock[];
  };
  changes: AssetChangeContent[];
};

type EnumItem = {
  index: string;
  name: string | null;
  title: string | null;
};

function findSavedBlock(
  blocks: SavedBlock[],
  block_ref: string,
): SavedBlock | null {
  let parsed: { blockName: string | null; blockId: string | null };
  try {
    parsed = parseAssetNewBlockRef(block_ref);
  } catch {
    return null;
  }
  if (parsed.blockName) {
    const by_name = blocks.find((b) => b.name === parsed.blockName);
    if (by_name) return by_name;
  }
  if (parsed.blockId) {
    const by_id = blocks.find((b) => b.id === parsed.blockId);
    if (by_id) return by_id;
  }
  return null;
}

function toChangesList(
  props_change: AssetBlockParamsDTO['props'],
): AssetProps[] {
  if (!props_change) return [];
  return Array.isArray(props_change) ? props_change : [props_change];
}

function readEnumItems(props: AssetProps): EnumItem[] {
  const items = new Map<string, EnumItem>();
  for (const key of Object.keys(props)) {
    const match = ENUM_ITEM_FIELD_REGEXP.exec(key);
    if (!match) continue;
    const [, index, field] = match;
    let item = items.get(index);
    if (!item) {
      item = { index, name: null, title: null };
      items.set(index, item);
    }
    const value = props[key];
    const str =
      value === null || value === undefined
        ? null
        : castAssetPropValueToString(value);
    if (field === 'name') item.name = str;
    else item.title = str;
  }
  return [...items.values()].sort((a, b) => {
    const a_num = Number(a.index);
    const b_num = Number(b.index);
    if (Number.isNaN(a_num) || Number.isNaN(b_num)) {
      return a.index.localeCompare(b.index);
    }
    return a_num - b_num;
  });
}

function applyEnumItemChanges(
  items: EnumItem[],
  sets: { index: string; field: 'name' | 'title'; value: AssetPropValue }[],
  deletes: string[],
): EnumItem[] {
  let result = items.map((item) => ({ ...item }));
  for (const index of deletes) {
    result = result.filter((item) => item.index !== index);
  }
  for (const set of sets) {
    let item = result.find((i) => i.index === set.index);
    if (!item) {
      item = { index: set.index, name: null, title: null };
      result.push(item);
    }
    const str =
      set.value === null || set.value === undefined
        ? null
        : castAssetPropValueToString(set.value);
    if (set.field === 'name') item.name = str;
    else item.title = str;
  }
  result.sort((a, b) => {
    const a_num = Number(a.index);
    const b_num = Number(b.index);
    if (Number.isNaN(a_num) || Number.isNaN(b_num)) {
      return a.index.localeCompare(b.index);
    }
    return a_num - b_num;
  });
  return result;
}

function diffEnumItems(
  old_items: EnumItem[],
  new_items: EnumItem[],
): RefactorEnumChange[] {
  const result: RefactorEnumChange[] = [];
  const old_by_name = new Map<string, EnumItem>();
  for (const item of old_items) {
    if (item.name) old_by_name.set(item.name, item);
  }
  const new_by_name = new Map<string, EnumItem>();
  for (const item of new_items) {
    if (item.name) new_by_name.set(item.name, item);
  }

  for (const [name, old_item] of old_by_name) {
    const new_item = new_by_name.get(name);
    if (!new_item) continue;
    if ((old_item.title ?? null) !== (new_item.title ?? null)) {
      result.push({
        kind: 'enum',
        oldName: name,
        newName: name,
        oldTitle: old_item.title,
        newTitle: new_item.title,
      });
    }
  }

  const unmatched_old = old_items.filter(
    (item) => item.name !== null && !new_by_name.has(item.name),
  );
  const unmatched_new = new_items.filter(
    (item) => item.name !== null && !old_by_name.has(item.name),
  );
  const paired_new = new Set<EnumItem>();
  for (const old_item of unmatched_old) {
    if (old_item.name === null) continue;
    const by_index = unmatched_new.find(
      (item) => !paired_new.has(item) && item.index === old_item.index,
    );
    const new_item =
      by_index ??
      unmatched_new.find((item) => !paired_new.has(item) && item.name !== null);
    if (!new_item || new_item.name === null) continue;
    paired_new.add(new_item);
    result.push({
      kind: 'enum',
      oldName: old_item.name,
      newName: new_item.name,
      oldTitle: old_item.title,
      newTitle: new_item.title,
    });
  }
  return result;
}

export function extractRefactorChanges(
  input: RefactorDetectInput,
): RefactorChange[] {
  const changes: RefactorChange[] = [];
  const is_enum = input.assetFull.typeIds.includes(ENUM_ASSET_ID);

  const enum_sets: {
    index: string;
    field: 'name' | 'title';
    value: AssetPropValue;
  }[] = [];
  const enum_deletes: string[] = [];

  for (const change of input.changes) {
    if (!change.blocks) continue;
    for (const [block_ref, block_change] of Object.entries(change.blocks)) {
      const saved_block = findSavedBlock(input.assetFull.blocks, block_ref);
      if (!saved_block) continue;

      if (block_change.delete) {
        changes.push({
          kind: 'block',
          blockRef: block_ref,
          blockType: saved_block.type,
          from: saved_block.name ?? block_ref,
          newName: null,
          delete: true,
        });
        continue;
      }

      if (block_change.name !== undefined) {
        const new_name =
          block_change.name === null || block_change.name === ''
            ? null
            : block_change.name;
        const old_name = saved_block.name;
        if ((new_name ?? null) !== (old_name ?? null)) {
          changes.push({
            kind: 'block',
            blockRef: block_ref,
            blockType: saved_block.type,
            from: old_name ?? block_ref,
            newName: new_name,
            delete: false,
          });
        }
      }

      const props_changes = toChangesList(block_change.props);
      for (const props_change of props_changes) {
        const parsed = parseChange(props_change);

        for (const rename of parsed.renaming) {
          if (is_enum && isEnumItemKey(rename.oldname)) continue;
          changes.push({
            kind: 'key',
            blockRef: block_ref,
            blockType: saved_block.type,
            from: rename.oldname,
            to: rename.newname,
          });
        }
        for (const deleted_key of parsed.deleting) {
          if (is_enum && isEnumItemKey(deleted_key)) {
            const delete_match = ENUM_ITEM_DELETE_REGEXP.exec(deleted_key);
            if (delete_match) enum_deletes.push(delete_match[1]);
            continue;
          }
          changes.push({
            kind: 'key',
            blockRef: block_ref,
            blockType: saved_block.type,
            from: deleted_key,
            to: null,
          });
        }

        for (const [key, value] of Object.entries(parsed.overlay)) {
          if (
            saved_block.type === 'table' &&
            key === '__primary' &&
            !Object.is(saved_block.props['__primary'], value)
          ) {
            changes.push({
              kind: 'primary',
              blockRef: block_ref,
              blockType: saved_block.type,
              value,
            });
          }
          if (is_enum) {
            const field_match = ENUM_ITEM_FIELD_REGEXP.exec(key);
            if (field_match) {
              enum_sets.push({
                index: field_match[1],
                field: field_match[2] as 'name' | 'title',
                value,
              });
            }
          }
        }
      }
    }
  }

  if (is_enum && (enum_sets.length > 0 || enum_deletes.length > 0)) {
    const enum_block =
      input.assetFull.blocks.find((b) =>
        Object.keys(b.props).some((k) => ENUM_ITEM_FIELD_REGEXP.test(k)),
      ) ?? null;
    const old_items = enum_block ? readEnumItems(enum_block.props) : [];
    const new_items = applyEnumItemChanges(old_items, enum_sets, enum_deletes);
    changes.push(...diffEnumItems(old_items, new_items));
  }

  return changes;
}
