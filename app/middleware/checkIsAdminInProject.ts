import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { getSignInLink } from '#logic/router/routes-helpers';
import { useRouteProjectContextRequired } from '~/composables/useRouteProjectContext';

export default defineNuxtRouteMiddleware(async (to) => {
  const projectContext = await useRouteProjectContextRequired(to);
  const user_role = projectContext.user?.role;
  if (!user_role?.isAdmin) {
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
