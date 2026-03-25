import type { AssetFullInstanceR } from '#logic/types/AssetFullInstance';
import type { AssetsFullResult } from '#logic/types/AssetsType';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { AssetSubContext } from '../AssetSubContext';

export function serializeAssetFullInstances(
  projectContext: IProjectContext,
  assets: AssetFullInstanceR[],
): AssetsFullResult {
  const res: AssetsFullResult = {
    ids: assets.map((a) => a.id),
    objects: {
      assetFulls: {},
      assetShorts: {},
      users: {},
      workspaces: {},
    },
    total: assets.length,
  };
  for (const asset of assets) {
    res.objects.assetFulls[asset.id] = asset.convertToFull();
    if (asset.typeIds) {
      for (const type_id of asset.typeIds) {
        const short = projectContext
          .get(AssetSubContext)
          .getAssetShortViaCacheSync(type_id);
        if (!short) continue;
        res.objects.assetShorts[short.id] = short;
      }
    }
    const workspaces = asset.workspaceId
      ? (projectContext
          .get(AssetSubContext)
          .getParentWorkspacesListFromCacheSync(asset.workspaceId) ?? [])
      : [];
    for (const workspace of workspaces) {
      res.objects.workspaces[workspace.id] = workspace;
    }
  }
  return res;
}
