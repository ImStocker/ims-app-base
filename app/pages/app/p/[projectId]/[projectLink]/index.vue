<script setup lang="ts">
import { navigateTo, useNuxtApp } from '#app';
import { definePageMeta, useAppManager } from '#imports';
import ProjectManager from '#logic/managers/ProjectManager';
import { assert } from '#logic/utils/typeUtils';
import { getSignInLink } from '#logic/router/routes-helpers';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';

definePageMeta({
  name: 'project-main',
  meta: {
    guest: true,
  },
  middleware: async (to) => {
    const { $appConfiguration } = useNuxtApp();

    const appManager = useAppManager();
    const projectInfo = appManager.get(ProjectManager).getProjectInfo();
    assert(projectInfo, 'Project is not loaded');

    const userRole = appManager.get(ProjectManager).getUserRoleInProject();
    if (userRole) {
      const app_menu = $appConfiguration.getProjectMenu(appManager);
      let available_workspace_name: any = null;

      await appManager
        .get(CreatorAssetManager)
        .requestWorkspaceInCacheByNames(
          app_menu
            .map((m) => m.rightsRelatedWorkspaceName)
            .filter((n) => n) as string[],
        );
      for (const section of app_menu) {
        available_workspace_name = section.rightsRelatedWorkspaceName;
        if (!available_workspace_name) continue;

        const workspace = appManager
          .get(CreatorAssetManager)
          .getWorkspaceByNameViaCacheSync(available_workspace_name);
        if (workspace) {
          if (workspace.name === 'gdd') {
            const index_asset = await appManager
              .get(CreatorAssetManager)
              .getAssetShortsList({
                where: {
                  workspaceid: workspace.id,
                  name: 'index',
                },
              });
            if (index_asset.list.length > 0) {
              return navigateTo(
                {
                  name: 'project-asset-by-id',
                  params: {
                    projectId: to.params.projectId,
                    projectLink: to.params.projectLink,
                    assetId: index_asset.list[0].id,
                  },
                },
                {
                  replace: true,
                  redirectCode: 301,
                },
              );
            }
          }

          // gdd и discussions
          return navigateTo(
            {
              name: 'project-workspace-by-name',
              params: {
                projectId: to.params.projectId,
                projectLink: to.params.projectLink,
                workspaceName: available_workspace_name,
              },
            },
            {
              replace: true,
              redirectCode: 301,
            },
          );
        } else {
          return navigateTo(
            {
              name: section.name,
              params: {
                projectId: to.params.projectId,
                projectLink: to.params.projectLink,
                workspaceName: available_workspace_name,
              },
            },
            {
              replace: true,
              redirectCode: 301,
            },
          );
        }
      }

      if (userRole) {
        return navigateTo(
          {
            name: 'project-welcome',
            params: {
              projectId: to.params.projectId,
              projectLink: to.params.projectLink,
            },
          },
          {
            replace: true,
            redirectCode: 301,
          },
        );
      } else {
        const sign_in_link = getSignInLink({
          redirect: to.fullPath,
          error: appManager.$t('auth.noAccessToOpenPage'),
        });
        return navigateTo(sign_in_link, {
          external: typeof sign_in_link === 'string',
          replace: true,
          redirectCode: 301,
        });
      }
    }
  },
});
</script>
