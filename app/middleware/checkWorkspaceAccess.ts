import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { useAppManager } from '../composables/useAppManager';
import CreatorAssetManager from '../logic/managers/CreatorAssetManager';
import { getSignInLink } from '../logic/router/routes-helpers';

export default defineNuxtRouteMiddleware(async (to) => {
  const appManager = useAppManager();
  const workspace = await appManager
    .get(CreatorAssetManager)
    .getWorkspaceByIdViaCache(
      (to.params.workspaceId
        ? to.params.workspaceId
        : to.params.boardId
      )?.toString(),
    );
  if (!workspace) {
    const sign_in_link = getSignInLink({
      redirect: to.fullPath,
      error: appManager.$t('auth.noAccessToOpenPage'),
    });
    return navigateTo(sign_in_link, {
      external: typeof sign_in_link === 'string',
    });
  }
  return true;
});
