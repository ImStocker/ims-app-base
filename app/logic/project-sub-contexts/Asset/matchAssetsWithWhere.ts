import type { AssetShort } from '#logic/types/AssetsType';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
  type AssetPropWhereCondition,
  type AssetPropWhereOp,
} from '#logic/types/PropsWhere';
import { isUUID } from 'validator';
import { AssetSubContext } from '../AssetSubContext';
import type { IProjectContext } from '#logic/types/IProjectContext';

export async function matchAssetsWithWhere(
  projectContext: IProjectContext,
  assets: AssetShort[],
  where: AssetPropWhere,
): Promise<AssetShort[]> {
  let custom_where = false;
  const match_string_values = (
    asset_val: string[],
    filter_val: AssetPropWhereCondition,
  ): boolean | undefined => {
    if (Array.isArray(filter_val)) {
      let failed = 0;
      for (const filter_val_one of filter_val) {
        if (typeof filter_val_one === 'string') {
          if (asset_val.includes(filter_val_one)) {
            return true;
          } else failed++;
        } else break;
      }
      if (failed === filter_val.length) return false;
    } else if (typeof filter_val === 'string') {
      return asset_val.includes(filter_val);
    } else if (filter_val && (filter_val as AssetPropWhereOp).op) {
      const op = filter_val as AssetPropWhereOp;
      if (op.op === AssetPropWhereOpKind.EQUAL && typeof op.v === 'string') {
        return asset_val.includes(op.v);
      } else if (
        op.op === AssetPropWhereOpKind.EQUAL_NOT &&
        typeof op.v === 'string'
      ) {
        return !asset_val.includes(op.v);
      }
    }
    return undefined;
  };

  const match_single_inside = (
    asset: AssetShort,
    filter_val: AssetPropWhereCondition,
  ) => {
    const asset_workspaces = asset.workspaceId
      ? projectContext
          .get(AssetSubContext)
          .getParentWorkspacesListFromCacheSync(asset.workspaceId)
      : [];
    if (asset_workspaces) {
      const m = match_string_values(
        asset_workspaces.map((w) => w.id),
        filter_val,
      );
      return m;
    }
    return undefined;
  };

  const match_single = (asset: AssetShort) => {
    for (const [key, val] of Object.entries(where)) {
      if (custom_where) {
        break;
      }
      if (val === undefined) continue;
      switch (key) {
        case 'id': {
          const m = match_string_values([asset.id], val);
          if (m === false) return m;
          else if (m === true) continue;
          break;
        }
        case 'typeids': {
          const m = match_string_values(asset.typeIds, val);
          if (m === false) return m;
          else if (m === true) continue;
          break;
        }
        case 'workspaceids': {
          const m = match_single_inside(asset, val);
          if (m === false) return m;
          else if (m === true) continue;
          break;
        }
        case 'inside': {
          const val_arr = Array.isArray(val) ? val : [val];
          const val_ids: string[] = [];

          for (const v of val_arr) {
            if (typeof v !== 'string') {
              custom_where = true;
              break;
            }
            if (isUUID(v)) {
              val_ids.push(v);
            } else {
              const workspace = projectContext
                .get(AssetSubContext)
                .getWorkspaceByNameViaCacheSync(v);
              if (workspace) val_ids.push(workspace.id);
              else {
                custom_where = true;
                break;
              }
            }
          }

          if (!custom_where) {
            const m = match_single_inside(asset, val_ids);
            if (m === false) return m;
            else if (m === true) continue;
          }
          break;
        }
        case 'type': {
          const val_arr = Array.isArray(val) ? val : [val];
          const val_ids: string[] = [];

          for (const v of val_arr) {
            if (typeof v !== 'string') {
              custom_where = true;
              break;
            }
            if (isUUID(v)) {
              val_ids.push(v);
            } else {
              const asset = projectContext
                .get(AssetSubContext)
                .getAssetShortByNameViaCacheSync(v);
              if (asset) val_ids.push(asset.id);
              else {
                custom_where = true;
                break;
              }
            }
          }

          if (!custom_where) {
            const m = match_string_values(asset.typeIds, val_ids);
            if (m === false) return m;
            else if (m === true) continue;
          }
          break;
        }
        case 'issystem':
        case 'isSystem': {
          if (typeof val === 'boolean') {
            if (val && asset.projectId !== projectContext.projectInfo.id) {
              return false;
            } else if (
              !val &&
              asset.projectId === projectContext.projectInfo.id
            ) {
              continue;
            }
          }
          break;
        }
      }
      custom_where = true;
    }
    return true;
  };

  const matched_simple: AssetShort[] = [];
  for (const asset of assets) {
    if (custom_where) break;
    if (match_single(asset)) {
      matched_simple.push(asset);
    }
  }

  if (!custom_where) return matched_simple;

  const matched = await projectContext
    .get(AssetSubContext)
    .getAssetsView<{ id: string }>({
      where: {
        id: assets.map((a) => a.id),
        cond: {
          op: AssetPropWhereOpKind.AND,
          v: [where],
        },
      },
      select: ['id'],
    });
  const matched_ids = new Set(matched.list.map((m) => m.id));
  return assets.filter((a) => matched_ids.has(a.id));
}
