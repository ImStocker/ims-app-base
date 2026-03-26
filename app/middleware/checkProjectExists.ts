import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import {
  getSignInLink,
  checkMainDomainRoutesAreUsing,
  getProjectSlug,
} from '#logic/router/routes-helpers';
import { useRouteProjectContextRequired } from '~/composables/useRouteProjectContext';

export default defineNuxtRouteMiddleware(async (to) => {
  const projectContext = await useRouteProjectContextRequired(to);

  const project = projectContext.projectInfo;
  if (!project) {
    const sign_in_link = getSignInLink({
      redirect: to.fullPath,
      error: projectContext.appManager.$t('auth.noAccessToOpenPage'),
    });
    return navigateTo(sign_in_link, {
      external: typeof sign_in_link === 'string',
    });
  }

  if (checkMainDomainRoutesAreUsing()) {
    const link = getProjectSlug(project);
    if (link !== to.params.projectLink) {
      return navigateTo(
        {
          name: to.name,
          query: to.query,
          hash: to.hash,
          params: {
            ...to.params,
            projectLink: link,
          },
        },
        {
          redirectCode: 301,
        },
      );
    }
  }
  return true;
});
