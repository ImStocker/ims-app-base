import isUUID from 'validator/es/lib/isUUID';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
  type AssetPropWhereCondition,
  type AssetPropWhereOp,
  type AssetPropWhereOpAnd,
} from '../../types/PropsWhere';
import type { Workspace } from '../../types/Workspaces';
import { intersectObjectArrays } from '../../utils/array';
import type CreatorAssetManager from '../../managers/CreatorAssetManager';

export type AnalyzedAssetSearchWhere = {
  willFindNothing: boolean;
  rootWorkspaces: Workspace[];
  rootWorkspacesStrict: boolean;
  assetWhereWithoutWorkspace: AssetPropWhere;
  query: string | undefined;
  isSystem: boolean | undefined;
};

export default async function analyzeAssetSearchWhere(
  creatorManager: CreatorAssetManager,
  assetWhere: AssetPropWhere,
): Promise<AnalyzedAssetSearchWhere> {
  let willFindNothing = false;
  let rootWorkspacesStrict = false;
  let rootWorkspaces: Workspace[] = [];
  let query: string | undefined = undefined;
  let isSystem: boolean | undefined = undefined;

  const process_key_val = async (key: string, val: AssetPropWhereCondition) => {
    let skip_key = false;

    if (key === 'query' && typeof val === 'string') {
      query = val;
    } else if (
      (key === 'isSystem' || key === 'issystem') &&
      typeof val === 'boolean'
    ) {
      isSystem = val;
    } else if (
      key === 'workspaceid' ||
      key === 'workspaceId' ||
      key === 'workspaceids' ||
      key === 'inside'
    ) {
      let val_arr: string[];
      if (typeof val === 'string') {
        val_arr = [val];
      } else if (
        Array.isArray(val) &&
        val.every((v) => typeof v === 'string')
      ) {
        val_arr = val;
      } else {
        return skip_key;
      }

      let inside_check = false;
      let workspace_ids: string[] = [];
      const workspace_names: string[] = [];
      switch (key) {
        case 'workspaceid':
        case 'workspaceId':
          workspace_ids = val_arr;
          break;
        case 'workspaceids':
          workspace_ids = val_arr;
          inside_check = true;
          break;
        case 'inside':
          for (const val_item of val_arr) {
            if (isUUID(val_item)) {
              workspace_ids.push(val_item);
            } else {
              workspace_names.push(val_item);
            }
          }
          inside_check = true;
          break;
      }

      const workspace_load: Promise<Workspace | null>[] = [];
      for (const workspace_id of workspace_ids) {
        workspace_load.push(
          creatorManager.getWorkspaceByIdViaCache(workspace_id),
        );
      }
      for (const workspace_name of workspace_names) {
        workspace_load.push(
          creatorManager.getWorkspaceByNameViaCache(workspace_name),
        );
      }

      const workspaces = await Promise.all(workspace_load);
      const exists_workspaces = workspaces.filter((w) => w) as Workspace[];

      if (
        workspaces.length > 0 &&
        workspaces.length === exists_workspaces.length
      ) {
        if (rootWorkspaces.length === 0) {
          rootWorkspaces = exists_workspaces;
          rootWorkspacesStrict = !inside_check;
        } else {
          if (inside_check || !rootWorkspacesStrict) {
            const all_workspaces_inside_workspaces = async (
              w_list: Workspace[],
              target_w_list: Workspace[],
            ) => {
              return (
                await Promise.all(
                  w_list.map(async (w) => {
                    return (
                      await Promise.all(
                        target_w_list.map((tw) => {
                          creatorManager.checkWorkspaceIsInside(w.id, tw.id);
                        }),
                      )
                    ).some((x) => x);
                  }),
                )
              ).every((x) => x);
            };

            if (
              await all_workspaces_inside_workspaces(
                exists_workspaces,
                rootWorkspaces,
              )
            ) {
              rootWorkspaces = exists_workspaces;
            }
          } else {
            rootWorkspaces = intersectObjectArrays(
              rootWorkspaces,
              exists_workspaces,
            );
            if (rootWorkspaces.length === 0) willFindNothing = true;
          }
        }

        skip_key = true;
      }
    }
    return skip_key;
  };

  const process_where = async (
    where: AssetPropWhere,
  ): Promise<AssetPropWhere> => {
    const new_where: AssetPropWhere = {};
    for (const [key, val] of Object.entries(where)) {
      if (val === undefined) {
        continue;
      }

      if (
        val &&
        typeof val === 'object' &&
        (val as AssetPropWhereOp).op === AssetPropWhereOpKind.AND
      ) {
        const ands = (val as AssetPropWhereOpAnd).v;
        const new_ands: AssetPropWhere[] = [];
        for (const and of ands) {
          const new_and = await process_where(and);
          if (Object.keys(new_and).length > 0) {
            new_ands.push(new_and);
          }
        }
        if (new_ands.length > 0) {
          new_where[key] = {
            op: AssetPropWhereOpKind.AND,
            v: new_ands,
          };
        }
      } else {
        const skip_key = await process_key_val(key, val);
        if (!skip_key) {
          new_where[key] = val;
        }
      }
    }
    return new_where;
  };

  const assetWhereWithoutWorkspace = await process_where(assetWhere);

  return {
    willFindNothing,
    rootWorkspaces,
    rootWorkspacesStrict,
    assetWhereWithoutWorkspace,
    query,
    isSystem,
  };
}
