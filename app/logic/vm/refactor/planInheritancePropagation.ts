import type {
  AssetBlockParamsDTO,
  AssetChangeBatchOpDTO,
  AssetPropsParamsDTO,
  AssetSetDTO,
} from '../../types/AssetsType';
import { parseAssetNewBlockRef, type AssetProps } from '../../types/Props';
import { MIN_ASSET_RIGHTS_TO_CHANGE } from '../../types/Rights';
import type { RefactorInheritanceChange } from './refactorTypes';

export type ChildBlockInput = {
  id: string;
  name: string | null;
  type: string;
  props: AssetProps;
  own: boolean;
};

export type ChildInput = {
  id: string;
  rights: number;
  blocks: ChildBlockInput[];
};

export type InheritancePropagationPlan = {
  ops: AssetChangeBatchOpDTO[];
  affectedChildIds: string[];
  skippedRightsChildIds: string[];
};

type ParsedRef = { blockName: string | null; blockId: string | null };

function childOwnsKey(props: AssetProps, from: string): boolean {
  if (Object.prototype.hasOwnProperty.call(props, from)) return true;
  const prefix = from + '\\';
  return Object.keys(props).some(
    (key) => !key.startsWith('~') && key.startsWith(prefix),
  );
}

function buildKeyDirectives(
  props: AssetProps,
  from: string,
  to: string | null,
): AssetPropsParamsDTO {
  const result: AssetPropsParamsDTO = {};
  if (childOwnsKey(props, from)) {
    result['~' + from] = to;
  }
  if (to === null) return result;

  for (const key of Object.keys(props)) {
    let mirrored: string;
    if (key === '~' + from) {
      mirrored = '~' + to;
    } else if (key.startsWith('~' + from + '\\')) {
      mirrored = '~' + to + key.substring(from.length + 1);
    } else {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(props, mirrored)) {
      result[mirrored] = props[key];
    }
  }
  return result;
}

function childOwnsBlockData(block: ChildBlockInput): boolean {
  return Object.keys(block.props).length > 0;
}

function parseRef(block_ref: string): ParsedRef {
  try {
    return parseAssetNewBlockRef(block_ref);
  } catch {
    return { blockName: null, blockId: null };
  }
}

function findChildBlock(
  child: ChildInput,
  parsed_ref: ParsedRef,
  block_type: string,
): ChildBlockInput | null {
  for (const block of child.blocks) {
    const matches_ref = parsed_ref.blockName
      ? block.name === parsed_ref.blockName
      : block.id === parsed_ref.blockId;
    if (!matches_ref) continue;
    if (block.type !== block_type) continue;
    return block;
  }
  return null;
}

export function planInheritancePropagation(
  changes: RefactorInheritanceChange[],
  children: ChildInput[],
): InheritancePropagationPlan {
  const affectedChildIds: string[] = [];
  const skippedRightsChildIds: string[] = [];
  const grouped = new Map<string, { ids: string[]; set: AssetSetDTO }>();
  const parsed_refs = new Map<string, ParsedRef>();

  for (const child of children) {
    const blocks_changes = new Map<
      string,
      { params: AssetBlockParamsDTO; props: AssetPropsParamsDTO }
    >();

    for (const change of changes) {
      let parsed_ref = parsed_refs.get(change.blockRef);
      if (!parsed_ref) {
        parsed_ref = parseRef(change.blockRef);
        parsed_refs.set(change.blockRef, parsed_ref);
      }
      const block = findChildBlock(child, parsed_ref, change.blockType);
      if (!block) continue;

      let entry = blocks_changes.get(change.blockRef);
      if (!entry) {
        entry = { params: {}, props: {} };
        blocks_changes.set(change.blockRef, entry);
      }

      if (change.kind === 'key') {
        Object.assign(
          entry.props,
          buildKeyDirectives(block.props, change.from, change.to),
        );
      } else if (change.kind === 'block') {
        if (change.delete) {
          if (!childOwnsBlockData(block)) continue;
          entry.params.delete = true;
        } else {
          if (!block.own) continue;
          entry.params.name = change.newName;
        }
      } else if (change.kind === 'primary') {
        if (Object.prototype.hasOwnProperty.call(block.props, '__primary')) {
          entry.props['__primary'] = change.value;
        }
      }
    }

    const blocks: { [ref: string]: AssetBlockParamsDTO } = {};
    for (const [ref, entry] of blocks_changes) {
      if (Object.keys(entry.props).length > 0) {
        entry.params.props = entry.props;
      }
      if (Object.keys(entry.params).length === 0) continue;
      blocks[ref] = entry.params;
    }
    if (Object.keys(blocks).length === 0) continue;

    if (child.rights < MIN_ASSET_RIGHTS_TO_CHANGE) {
      skippedRightsChildIds.push(child.id);
      continue;
    }

    const set: AssetSetDTO = { blocks };
    const payload = JSON.stringify(set);
    const group = grouped.get(payload);
    if (group) {
      group.ids.push(child.id);
    } else {
      grouped.set(payload, { ids: [child.id], set });
    }
    affectedChildIds.push(child.id);
  }

  const ops: AssetChangeBatchOpDTO[] = [];
  for (const group of grouped.values()) {
    ops.push({ where: { id: group.ids }, set: group.set });
  }

  return { ops, affectedChildIds, skippedRightsChildIds };
}
