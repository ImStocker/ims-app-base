<template>
  <GameDesignWorkspacePage
    v-if="workspacePageVM"
    :vm="workspacePageVM"
  ></GameDesignWorkspacePage>
  <CollectionWorkspacePage
    v-else-if="workspaceCollectionPageVM"
    :vm="workspaceCollectionPageVM"
  ></CollectionWorkspacePage>
</template>
<script setup lang="ts">
import {
  definePageMeta,
  useI18n,
  useNuxtApp,
  usePageHead,
  useProjectPageVM,
  useRoute,
  type Ref,
} from '#imports';
import GameDesignWorkspacePage from '#components/GameDesign/GameDesignWorkspacePage.vue';
import CollectionWorkspacePage from '#components/GameDesign/WorkspaceCollectionPage.vue';
import UiManager from '#logic/managers/UiManager';
import { convertTranslatedTitle } from '#logic/utils/assets';
import { WorkspacePageVM } from '#logic/vm/WorkspacePageVM';
import { WORKSPACE_TYPE_COLLECTION } from '#logic/types/Workspaces';
import { WorkspaceCollectionPageVM } from '#logic/vm/Workspace/WorkspaceCollectionPageVM';
import type { UnwrapRef } from 'vue';
import { useProjectMenu } from '#components/useProjectMenu';
import { useRouteProjectContextRequired } from '~/composables/useRouteProjectContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
const { t } = useI18n();
const { $getAppManager } = useNuxtApp();
const projectContext = await useRouteProjectContextRequired();
const route = useRoute();

const workspaceId = (route.params.workspaceId ?? '').toString();
const workspace = await projectContext
  .get(AssetSubContext)
  .getWorkspaceByIdViaCache(workspaceId);

let workspacePageVM: Ref<UnwrapRef<WorkspacePageVM>> | null = null;
let workspaceCollectionPageVM: Ref<
  UnwrapRef<WorkspaceCollectionPageVM>
> | null = null;

if (workspace && workspace.props.type === WORKSPACE_TYPE_COLLECTION) {
  workspaceCollectionPageVM = await useProjectPageVM(
    WorkspaceCollectionPageVM,
    () => ({
      lang: $getAppManager().get(UiManager).getLanguage(),
      searchQuery: {
        workspaceids: route.params.workspaceId.toString(),
      },
    }),
  );
} else {
  workspacePageVM = await useProjectPageVM(WorkspacePageVM, () => ({
    lang: $getAppManager().get(UiManager).getLanguage(),
    searchQuery: {
      workspaceids: route.params.workspaceId.toString(),
    },
  }));
}

definePageMeta({
  name: 'project-workspace-by-id',
  middleware: [
    'check-workspace-access',
    async (to) => {
      const projectContext = await useRouteProjectContextRequired(to);
      const workspaceId = (to.params.workspaceId ?? '').toString();
      const projectMenu = useProjectMenu(projectContext);
      await projectMenu.revealProjectWorkspace(workspaceId);
      return true;
    },
  ],
});
usePageHead(() => ({
  title: [
    workspace?.title
      ? convertTranslatedTitle(workspace.title, (key) => t(key))
      : t('translatedTitles.Items'),
    projectContext.projectInfo.title,
    'IMS Creators',
  ].join(' | '),
}));
</script>
