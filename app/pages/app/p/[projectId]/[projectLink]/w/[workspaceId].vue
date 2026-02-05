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
  usePageVM,
  useRoute,
  type Ref,
} from '#imports';
import GameDesignWorkspacePage from '../../../../../../components/GameDesign/GameDesignWorkspacePage.vue';
import CollectionWorkspacePage from '../../../../../../components/GameDesign/WorkspaceCollectionPage.vue';
import CreatorAssetManager from '../../../../../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../../../../../logic/managers/ProjectManager';
import UiManager from '../../../../../../logic/managers/UiManager';
import { convertTranslatedTitle } from '../../../../../../logic/utils/assets';
import { assert } from '../../../../../../logic/utils/typeUtils';
import { WorkspacePageVM } from '../../../../../../logic/vm/WorkspacePageVM';
import { WORKSPACE_TYPE_COLLECTION } from '../../../../../../logic/types/Workspaces';
import { WorkspaceCollectionPageVM } from '../../../../../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import type { UnwrapRef } from 'vue';
import { useProjectMenu } from '../../../../../../components/useProjectMenu';
const { t } = useI18n();
const { $getAppManager } = useNuxtApp();
const projectInfo = $getAppManager().get(ProjectManager).getProjectInfo();
assert(projectInfo, 'Project not loaded');
const route = useRoute();

const workspaceId = (route.params.workspaceId ?? '').toString();
const workspace = await $getAppManager()
  .get(CreatorAssetManager)
  .getWorkspaceByIdViaCache(workspaceId);

let workspacePageVM: Ref<UnwrapRef<WorkspacePageVM>> | null = null;
let workspaceCollectionPageVM: Ref<
  UnwrapRef<WorkspaceCollectionPageVM>
> | null = null;

if (workspace && workspace.props.type === WORKSPACE_TYPE_COLLECTION) {
  workspaceCollectionPageVM = await usePageVM(
    WorkspaceCollectionPageVM,
    () => ({
      lang: $getAppManager().get(UiManager).getLanguage(),
      searchQuery: {
        workspaceids: route.params.workspaceId.toString(),
      },
    }),
  );
} else {
  workspacePageVM = await usePageVM(WorkspacePageVM, () => ({
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
      const workspaceId = (to.params.workspaceId ?? '').toString();
      const projectMenu = useProjectMenu();
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
    projectInfo.title,
    'IMS Creators',
  ].join(' | '),
}));
</script>
