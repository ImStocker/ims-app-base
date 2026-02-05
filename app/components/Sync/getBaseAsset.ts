import { getPreparedAssets } from '../../logic/local-fs-sync/getPreparedAsset';
import type { JsonSyncExportSegmentFormatOptionsType } from '../../logic/local-fs-sync/segments/JsonSyncExportSegment';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { IAppManager } from '../../logic/managers/IAppManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';

export async function getBaseAssetObject(
  appManager: IAppManager,
  assetFilter: AssetPropWhere | null,
  options:
    | {
        fields: { ref: string; name: string }[];
        kind: 'selectFields';
      }
    | {
        kind: 'full' | 'valuesOnly';
      }
    | {
        fields?: { ref: string; name: string }[];
        kind: JsonSyncExportSegmentFormatOptionsType;
      },
) {
  const asset_id = await getBaseAssetId(appManager, assetFilter);
  if (!asset_id) return null;
  const prepared_assets = await getPreparedAssets(
    appManager,
    {
      where: {
        id: [asset_id],
      },
      count: 1,
    },
    options,
  );
  return prepared_assets[0];
}

export async function getWorkspaceBaseAssetId(
  appManager: IAppManager,
  workspace_id: string,
) {
  const workspace = await appManager
    .get(CreatorAssetManager)
    .getWorkspaceByIdViaCache(workspace_id);
  const asset_id = workspace?.props.asset
    ? (workspace?.props.asset['AssetId'] as string)
    : null;
  if (!asset_id) return null;
  return asset_id;
}
export async function getBaseAssetId(
  appManager: IAppManager,
  assetFilter: AssetPropWhere | null,
) {
  if (assetFilter?.workspaceids) {
    const workspace_id = (
      Array.isArray(assetFilter.workspaceids)
        ? assetFilter.workspaceids[0]
        : assetFilter.workspaceids
    ) as string;

    return getWorkspaceBaseAssetId(appManager, workspace_id);
  }

  const gdd_workspace_id = appManager
    .get(ProjectManager)
    .getWorkspaceIdByName('gdd');

  return (
    (
      await appManager.get(CreatorAssetManager).getAssetInstancesList({
        where: {
          workspaceids: gdd_workspace_id,
          ...assetFilter,
        },
      })
    ).list[0]?.id ?? null
  );
}
