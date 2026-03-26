import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { getSignInLink } from '#logic/router/routes-helpers';
import { useRouteProjectContextRequired } from '~/composables/useRouteProjectContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';

export default defineNuxtRouteMiddleware(async (to) => {
  const projectContext = await useRouteProjectContextRequired(to);
  const workspace = await projectContext
    .get(AssetSubContext)
    .getWorkspaceByIdViaCache(
      (to.params.workspaceId
        ? to.params.workspaceId
        : to.params.boardId
      )?.toString(),
    );
  if (!workspace) {
    const sign_in_link = getSignInLink({
      redirect: to.fullPath,
      error: projectContext.appManager.$t('auth.noAccessToOpenPage'),
    });
    return navigateTo(sign_in_link, {
      external: typeof sign_in_link === 'string',
    });
  }
  return true;
});
