import { useAppManager } from '../../composables/useAppManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { IAppManager } from '../../logic/managers/IAppManager';
import type { AssetShort } from '../../logic/types/AssetsType';
import type { BreadCrumbsEntity } from '../../logic/types/BreadCrumbs';
import type { AssetPropValueAsset } from '../../logic/types/Props';
import {
  WORKSPACE_TYPE_COLLECTION,
  type Workspace,
} from '../../logic/types/Workspaces';

export function useWorkspaceBreadcrumbs(
  workspace_id: string,
): BreadCrumbsEntity[] {
  const appManager = useAppManager();
  function recursive(
    current_workspace_id: string,
    workspace_routes: BreadCrumbsEntity[],
  ) {
    const workspace = appManager
      .get(CreatorAssetManager)
      .getWorkspaceByIdViaCacheSync(current_workspace_id);
    if (workspace) {
      if (workspace.id !== workspace_id) {
        workspace_routes.unshift({
          title: workspace.title,
          name: 'project-workspace-by-id',
          params: { workspaceId: workspace.id },
        });
      }

      if (workspace.parentId) {
        return recursive(workspace.parentId, workspace_routes);
      }
    }
    return workspace_routes;
  }
  return recursive(workspace_id, []);
}

export function isWorkspaceInsideCollection(
  appManager: IAppManager,
  workspace_id: string,
  skip_self = true,
) {
  function recursive(current_workspace_id: string, skip: boolean) {
    const workspace = appManager
      .get(CreatorAssetManager)
      .getWorkspaceByIdViaCacheSync(current_workspace_id);
    if (workspace) {
      if (!skip && workspace.props.type === WORKSPACE_TYPE_COLLECTION) {
        return true;
      }

      if (workspace.parentId) {
        return recursive(workspace.parentId, false);
      }
    }
    return false;
  }
  return recursive(workspace_id, skip_self);
}

export function getWorkspaceCollectionAsset(
  workspace: Workspace,
): AssetPropValueAsset | null {
  if (workspace.props.type !== WORKSPACE_TYPE_COLLECTION) {
    return null;
  }
  const asset_link = workspace.props.asset;
  if (asset_link && (asset_link as AssetPropValueAsset).AssetId) {
    return asset_link as AssetPropValueAsset;
  } else {
    return null;
  }
}
export function getWorkspaceCollectionAssetShortSync(
  appManager: IAppManager,
  workspace: Workspace,
): AssetShort | undefined | null {
  const asset_link = getWorkspaceCollectionAsset(workspace);
  if (!asset_link) return null;
  return appManager
    .get(CreatorAssetManager)
    .getAssetShortViaCacheSync(asset_link.AssetId);
}
