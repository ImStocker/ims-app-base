<template>
  <div class="WorkspaceCollectionContent">
    <collection-content :controller="vm as any"></collection-content>
    <div
      v-if="vm.subWorkspaces.length > 0 && projectInfo"
      class="WorkspaceCollectionContent-folders"
    >
      <h3 class="WorkspaceCollectionContent-folders-header">
        {{ $t('sourcePage.folders.collection.folders') }}:
      </h3>
      <div class="WorkspaceCollectionContent-folders-list">
        <workspace-link
          v-for="workspace of vm.subWorkspaces"
          :key="workspace.id"
          class="WorkspaceCollectionContent-folders-item"
          :project="projectInfo"
          :workspace="workspace"
        ></workspace-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, inject, type PropType, type UnwrapRef } from 'vue';
import type { WorkspaceCollectionPageVM } from '../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import CollectionContent from './CollectionContent.vue';
import WorkspaceLink from '../Asset/WorkspaceLink.vue';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'WorkspaceCollectionContent',
  components: {
    CollectionContent,
    WorkspaceLink,
  },
  props: {
    vm: {
      type: Object as PropType<UnwrapRef<WorkspaceCollectionPageVM>>,
      required: true,
    },
  },
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    projectInfo() {
      return this.projectContext.projectInfo;
    },
  },
});
</script>

<style lang="scss" scoped>
.WorkspaceCollectionContent-folders-item {
  display: block;
  text-decoration: none;
  width: fit-content;
}

.WorkspaceCollectionContent-folders {
  padding-top: 20px;
}
</style>
