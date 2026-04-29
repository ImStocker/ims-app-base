import { defineNuxtRouteMiddleware, navigateTo, useRouter } from '#app';
import { useAppManager } from '../composables/useAppManager';
import ProjectManager from '../logic/managers/ProjectManager';
import { getProjectLink } from '../logic/router/routes-helpers';

export default defineNuxtRouteMiddleware(async () => {
  const appManager = useAppManager();
  const project = appManager.get(ProjectManager).getProjectInfo();
  if (!project) return false;
  if (project.isTemplate) {
    const $router = useRouter();
    return navigateTo(
      getProjectLink($router, project, {
        name: 'project-non-template-section',
      }),
      {
        redirectCode: 301,
      },
    );
  }
  return true;
});
