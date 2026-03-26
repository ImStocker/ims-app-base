import type { RouteParamsGeneric } from 'vue-router';
import { createError } from '#app';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';

export async function redirectFromNameToIdBase(
  projectContext: IProjectContext,
  to: {
    params?: RouteParamsGeneric;
  },
  type: 'workspace' | 'asset',
) {
  const target_name = to.params ? to.params[type + 'Name'].toString() : '';
  let target_id: string | null = null;

  if (type === 'workspace') {
    const workspace = await projectContext
      .get(AssetSubContext)
      .getWorkspaceByNameViaCache(target_name);
    if (workspace) target_id = workspace.id;
  } else if (type === 'asset') {
    const assets = await projectContext
      .get(AssetSubContext)
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
      message: projectContext.appManager.$t('pages.pageNotFound'),
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
