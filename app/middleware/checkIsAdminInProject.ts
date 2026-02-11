import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { useAppManager } from '../composables/useAppManager';
import ProjectManager from '#logic/managers/ProjectManager';
import { getSignInLink } from '#logic/router/routes-helpers';

export default defineNuxtRouteMiddleware(async (to) => {
  const appManager = useAppManager();
  const user_role = appManager.get(ProjectManager).getUserRoleInProject();
  if (!user_role?.isAdmin) {
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
