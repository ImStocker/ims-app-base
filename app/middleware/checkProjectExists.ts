import { defineNuxtRouteMiddleware, navigateTo, useNuxtApp } from '#app';
import ProjectManager from '../logic/managers/ProjectManager';
import {
  getSignInLink,
  checkMainDomainRoutesAreUsing,
} from '../logic/router/routes-helpers';
import { getProjectSlug } from '../logic/utils/creators';

export default defineNuxtRouteMiddleware(async (to) => {
  const { $getAppManager } = useNuxtApp();

  const project = $getAppManager().get(ProjectManager).getProjectInfo();
  if (!project) {
    const sign_in_link = getSignInLink({
      redirect: to.fullPath,
      error: $getAppManager().$t('auth.noAccessToOpenPage'),
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
