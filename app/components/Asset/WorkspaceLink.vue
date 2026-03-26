<template>
  <project-link
    class="WorkspaceLink"
    :class="{
      'state-loading': cachedWorkspace === undefined && showLoading,
      'state-error': assetNotFound,
    }"
    :project="project"
    :to="{
      name: 'project-workspace-by-id',
      params: {
        workspaceId: workspace.id,
      },
    }"
    :target="target"
    :exact="exact"
    title=""
    @mouseenter="onMouseEnter"
    @mousemove="onMouseEnter"
    @mouseleave="hideTooltip"
    @click="onClick"
    ><workspace-icon
      v-if="
        !!showIcon && cachedWorkspace && (isCollection || showIcon === 'always')
      "
      class="WorkspaceLink-icon"
      :workspace="cachedWorkspace"
    ></workspace-icon
    ><slot>{{ displayingWorkspaceTitle }}</slot
    ><dropdown-container
      v-if="tooltipAttachRect && showTooltip"
      :attach-to-rect="tooltipAttachRect"
      class="WorkspaceLink-tooltip-container"
    >
      <workspace-tooltip
        class="WorkspaceLink-tooltip"
        :workspace="workspace"
        :show-path="tooltipShowPath"
      ></workspace-tooltip></dropdown-container
  ></project-link>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent, inject, type PropType } from 'vue';
import type { ProjectInfoForLink } from '../../logic/router/routes-helpers';
import ProjectLink from '../Common/ProjectLink.vue';
import WorkspaceTooltip from './WorkspaceTooltip.vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import DropdownContainer from '../Common/DropdownContainer.vue';
import {
  WORKSPACE_TYPE_COLLECTION,
  type WorkspaceLink,
} from '../../logic/types/Workspaces';
import WorkspaceIcon from './WorkspaceIcon.vue';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';

const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 10;
const TOOLTIP_OFFSET_H = 20;

export default defineComponent({
  name: 'WorkspaceLink',
  components: {
    ProjectLink,
    WorkspaceIcon,
    WorkspaceTooltip,
    DropdownContainer,
  },
  props: {
    project: { type: Object as PropType<ProjectInfoForLink>, required: true },
    workspace: { type: Object as PropType<WorkspaceLink>, required: true },
    target: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    exact: { type: Boolean, default: false },
    showTooltip: { type: Boolean, default: true },
    showIcon: {
      type: [Boolean, String] as PropType<boolean | 'always'>,
      default: true,
    },
    showLoading: { type: Boolean, default: true },
    tooltipShowPath: { type: Boolean, default: true },
  },
  emits: ['click'],
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  data() {
    return {
      hoveredCoord: null as { x: number; y: number } | null,
      hoveredTimer: null as NodeJS.Timeout | null,
    };
  },
  computed: {
    isCollection() {
      return this.cachedWorkspace?.props?.type === WORKSPACE_TYPE_COLLECTION;
    },
    tooltipAttachRect() {
      if (!this.hoveredCoord) return null;
      return new DOMRect(
        this.hoveredCoord.x + TOOLTIP_OFFSET_X,
        this.hoveredCoord.y + TOOLTIP_OFFSET_Y - TOOLTIP_OFFSET_H,
        1,
        TOOLTIP_OFFSET_H,
      );
    },
    displayingWorkspaceTitle(): string {
      const asset_title = this.cachedWorkspace
        ? this.cachedWorkspace.title
        : this.workspace.title
          ? this.workspace.title
          : (this.workspace.name ?? '');
      return convertTranslatedTitle(asset_title ?? '', (key) => this.$t(key));
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
    assetNotFound(): boolean {
      return this.hasGddAccess && this.cachedWorkspace === null;
    },
  },
  unmounted() {
    this.hideTooltip();
  },
  methods: {
    async onClick(e: MouseEvent) {
      this.hideTooltip();
      this.$emit('click', e);
    },
    onMouseEnter(e: MouseEvent) {
      if (!this.$el) return;

      const new_coord = {
        x: e.clientX,
        y: e.clientY,
      };
      if (!this.hoveredCoord) {
        if (this.hoveredTimer) {
          return;
        }
        this.hoveredTimer = setTimeout(() => {
          this.hoveredCoord = new_coord;
          this.hoveredTimer = null;
        }, 200);
      } else this.hoveredCoord = new_coord;
    },
    hideTooltip() {
      if (this.hoveredTimer) {
        clearTimeout(this.hoveredTimer);
        this.hoveredTimer = null;
      }
      this.hoveredCoord = null;
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';

.WorkspaceLink {
  &.state-error {
    color: var(--color-main-error);
  }
}

.WorkspaceLink-icon {
  margin-right: 2px;
}

.WorkspaceLink-collectionIcon-asset {
  @include asset-icons.asset-icons;
}

.WorkspaceLink-tooltip {
  max-width: min(400px, 80dvw);
}
</style>

<style lang="scss">
.WorkspaceLink-tooltip-container,
.WorkspaceLink-tooltip {
  pointer-events: none;
}
</style>
