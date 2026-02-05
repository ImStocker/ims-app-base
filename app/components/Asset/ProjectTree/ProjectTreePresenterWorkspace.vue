<template>
  <div class="ProjectTreePresenterWorkspace">
    <block-with-menu
      v-if="workspace && projectInfo"
      class="ProjectTreePresenter-row type-asset"
      :menu-list="getWorkspaceMenu(workspace)"
      menu-position="append"
    >
      <div
        v-if="$slots.workspacePrepend && workspace"
        class="ProjectTreePresenter-prepend"
      >
        <slot name="workspacePrepend" :workspace="workspace"></slot>
      </div>
      <workspace-link
        :project="projectInfo"
        :workspace="workspace"
        class="ProjectTreePresenter-link"
        :show-loading="false"
        :show-icon="showIcon"
        :tooltip-show-path="showProjectItemsPathInTooltip"
        :draggable="false"
        @click.prevent
      ></workspace-link>
      <div
        v-if="$slots.workspaceAppend && workspace"
        class="ProjectTreePresenter-append"
      >
        <slot name="workspaceAppend" :workspace="workspace"></slot>
      </div>

      <template
        v-for="injectedBlockSlot of injectedBlockSlots"
        :key="injectedBlockSlot.originalSlot"
        #[injectedBlockSlot.blockSlot]
      >
        <slot :name="injectedBlockSlot.originalSlot"></slot>
      </template>
    </block-with-menu>
    <div v-else class="ProjectTreePresenterWorkspace-notFound">
      {{ item.title }}
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ProjectTreeItemPayload } from './ProjectTreePresenterBaseVM';
import type { TreePresenterItem } from '../../Common/TreePresenter/TreePresenter';
import type { ExtendedMenuListItem } from '../../../logic/types/MenuList';
import WorkspaceLink from '../WorkspaceLink.vue';
import BlockWithMenu from '../../Common/BlockWithMenu.vue';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../../logic/managers/ProjectManager';
import type { Workspace } from '../../../logic/types/Workspaces';

export default defineComponent({
  name: 'ProjectTreePresenterWorkspace',
  components: {
    WorkspaceLink,
    BlockWithMenu,
  },
  props: {
    item: {
      type: Object as PropType<TreePresenterItem<ProjectTreeItemPayload>>,
      required: true,
    },
    showIcon: {
      type: [Boolean, String] as PropType<boolean | 'always'>,
      default: true,
    },
    getWorkspaceMenu: {
      type: Function as PropType<
        (workspace: Workspace) => ExtendedMenuListItem[]
      >,
      required: true,
    },
    showProjectItemsPathInTooltip: { type: Boolean, default: false },
  },
  computed: {
    injectedBlockSlots() {
      return Object.keys(this.$slots)
        .filter((slotName) => slotName.startsWith('menu-'))
        .map((slotName) => {
          return {
            originalSlot: slotName,
            blockSlot: slotName.substring('menu-'.length),
          };
        });
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    workspace() {
      return this.$getAppManager()
        .get(CreatorAssetManager)
        .getWorkspaceByIdViaCacheSync(this.item.payload.id);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ProjectTreePresenterWorkspace-notFound {
  color: var(--color-main-error);
}
.ProjectTreePresenterWorkspace-inherit {
  padding-left: calc(5px * var(--ProjectTreePresenterWorkspace-inherit));
}
</style>
