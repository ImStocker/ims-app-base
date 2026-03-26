import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { getPreparedAssets } from '../../logic/local-fs-sync/getPreparedAsset';
import type { JsonSyncExportSegmentFormatOptionsType } from '../../logic/local-fs-sync/segments/JsonSyncExportSegment';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';

export async function getBaseAssetObject(
  projectContext: IProjectContext,
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
  const asset_id = await getBaseAssetId(projectContext, assetFilter);
  if (!asset_id) return null;
  const prepared_assets = await getPreparedAssets(
    projectContext,
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
  projectContext: IProjectContext,
  workspace_id: string,
) {
  const workspace = await projectContext
    .get(AssetSubContext)
    .getWorkspaceByIdViaCache(workspace_id);
  const asset_id = workspace?.props.asset
    ? (workspace?.props.asset['AssetId'] as string)
    : null;
  if (!asset_id) return null;
  return asset_id;
}
export async function getBaseAssetId(
  projectContext: IProjectContext,
  assetFilter: AssetPropWhere | null,
) {
  if (assetFilter?.workspaceids) {
    const workspace_id = (
      Array.isArray(assetFilter.workspaceids)
        ? assetFilter.workspaceids[0]
        : assetFilter.workspaceids
    ) as string;

    return getWorkspaceBaseAssetId(projectContext, workspace_id);
  }

  const gdd_workspace_id = await projectContext
    .get(AssetSubContext)
    .getWorkspaceByNameViaCache('gdd');

  return (
    (
      await projectContext.get(AssetSubContext).getAssetInstancesList({
        where: {
          workspaceids: gdd_workspace_id,
          ...assetFilter,
        },
      })
    ).list[0]?.id ?? null
  );
}
