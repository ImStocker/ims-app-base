import type { RouteLocationNormalized } from 'vue-router';
import CreatorAssetManager from '../managers/CreatorAssetManager';
import type { IAppManager } from '../managers/IAppManager';
import { createError } from '#app';

export async function redirectFromNameToIdBase(
  appManager: IAppManager,
  to: RouteLocationNormalized,
  type: 'workspace' | 'asset',
) {
  const target_name = to.params[type + 'Name'].toString();
  let target_id: string | null = null;

  if (type === 'workspace') {
    const workspace = await appManager
      .get(CreatorAssetManager)
      .getWorkspaceByNameViaCache(target_name);
    if (workspace) target_id = workspace.id;
  } else if (type === 'asset') {
    const assets = await appManager
      .get(CreatorAssetManager)
      .getAssetShortsList({
        where: {
          name: target_name,
          isSystem: false,
        },
      });
    if (assets.list.length > 0) {
      target_id = assets.list[0].id;
    }
  }

  if (!target_id) {
    throw createError({
      statusCode: 404,
      message: appManager.$t('pages.pageNotFound'),
    });
  }

  const new_params = {
    ...to.params,
    [type + 'Id']: target_id,
  };
  delete new_params[type + 'Name'];
  return {
    ...to,
    name: `project-${type}-by-id`,
    params: new_params,
  };
}
