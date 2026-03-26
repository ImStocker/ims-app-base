<template>
  <div class="WorkspaceTooltip">
    <div
      v-if="workspacesPath.length > 0 && showPath"
      class="WorkspaceTooltip-path"
    >
      <span
        v-for="w of workspacesPath"
        :key="w.id"
        class="WorkspaceTooltip-path-segment"
      >
        {{ $tTitle(w.title) }} /
      </span>
    </div>
    <div class="WorkspaceTooltip-title">
      <div class="WorkspaceTooltip-title-content">
        <workspace-icon
          v-if="cachedWorkspace"
          class="WorkspaceTooltip-icon"
          :workspace="cachedWorkspace"
        ></workspace-icon>
        {{ workspaceTitle }}
        <span v-if="workspaceNotFound" class="WorkspaceTooltip-notFound">{{
          $t('common.notFound')
        }}</span>
      </div>
      <span v-if="workspaceName" class="WorkspaceTooltip-name">
        <i class="ri-price-tag-3-fill"></i>
        {{ workspaceName }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, inject, type PropType } from 'vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import type { Workspace, WorkspaceLink } from '../../logic/types/Workspaces';
import WorkspaceIcon from './WorkspaceIcon.vue';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'WorkspaceTooltip',
  components: {
    WorkspaceIcon,
  },
  props: {
    workspace: { type: Object as PropType<WorkspaceLink>, required: true },
    showPath: { type: Boolean, default: true },
  },
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    workspaceTitle() {
      if (this.cachedWorkspace) {
        return convertTranslatedTitle(
          this.cachedWorkspace.title ?? '',
          (...args) => this.$t(...args),
        );
      } else
        return convertTranslatedTitle(this.workspace.title ?? '', (...args) =>
          this.$t(...args),
        );
    },
    workspaceName() {
      if (this.cachedWorkspace) {
        return this.cachedWorkspace.name;
      } else {
        return this.workspace.name;
      }
    },
    cachedWorkspace() {
      const cached = this.projectContext
        .get(AssetSubContext)
        .getWorkspaceByIdViaCacheSync(this.workspace.id);
      if (cached === undefined) {
        this.projectContext
          .get(AssetSubContext)
          .requestWorkspaceInCache(this.workspace.id);
      }
      return cached;
    },

    hasGddAccess() {
      const role = this.projectContext.user?.role;
      if (role) return true;
      const project = this.projectContext.projectInfo;
      if (!project) return false;
      return project.isPublicGdd;
    },
    workspaceNotFound(): boolean {
      return this.hasGddAccess && this.cachedWorkspace === null;
    },
    workspacesPath(): Workspace[] {
      const cached_workspace = this.cachedWorkspace;
      if (!cached_workspace) {
        return [];
      }
      return cached_workspace.parentId
        ? (this.projectContext
            .get(AssetSubContext)
            .getParentWorkspacesListFromCacheSync(cached_workspace.parentId) ??
            [])
        : [];
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.WorkspaceTooltip {
  --local-bg-color: var(--dropdown-bg-color);
  background-color: var(--dropdown-bg-color);
  backdrop-filter: var(--dropdown-bg-filter);
  box-shadow: var(--dropdown-box-shadow);
  border-radius: var(--dropdown-border-radius);
  padding: 5px 10px;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto 1fr;
}

.WorkspaceTooltip-path {
  grid-column: 1 / 3;
  grid-row: 1;
  color: var(--local-sub-text-color);
  font-size: 12px;
  margin-bottom: 2px;
}

.WorkspaceTooltip-title {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.WorkspaceTooltip-title-content {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex: 1;
  align-items: center;
}

.WorkspaceTooltip-name {
  color: var(--local-sub-text-color);
  font-size: 12px;
}

.WorkspaceTooltip-notFound {
  color: var(--color-main-error);
}
</style>
