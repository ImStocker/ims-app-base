<template>
  <project-link
    class="AssetLink"
    :class="{
      'state-loading': isLoadingShown,
      'state-error': assetNotFound,
    }"
    :project="project"
    :to="{
      name: 'project-asset-by-id',
      params: {
        assetId: asset.id,
      },
      hash: asset.blockId
        ? '#' +
          makeAnchorTagId(
            asset.blockId,
            asset.anchor ? asset.anchor : undefined,
          )
        : undefined,
    }"
    :target="target"
    :exact="exact"
    title=""
    @mouseenter="onMouseEnter"
    @mousemove="onMouseEnter"
    @mouseleave="hideTooltip"
    @click="onClick"
    ><asset-icon
      v-if="!!showIcon && !isLoadingShown"
      class="AssetLink-icon"
      :asset="asset"
    ></asset-icon
    ><span class="AssetLink-title"
      ><slot>{{ displayingAssetTitle }}</slot></span
    ><dropdown-container
      v-if="tooltipAttachRect && showTooltip"
      :attach-to-rect="tooltipAttachRect"
      class="AssetLink-tooltip-container"
    >
      <asset-tooltip
        class="AssetLink-tooltip"
        :asset="asset"
        :show-path="tooltipShowPath"
      ></asset-tooltip></dropdown-container
  ></project-link>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import type { ProjectInfoForLink } from '../../logic/router/routes-helpers';
import ProjectLink from '../Common/ProjectLink.vue';
import {
  convertTranslatedTitle,
  makeAnchorTagId,
} from '../../logic/utils/assets';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { AssetLink } from '../../logic/types/AssetsType';
import DropdownContainer from '../Common/DropdownContainer.vue';
import ProjectManager from '../../logic/managers/ProjectManager';
import AssetIcon from './AssetIcon.vue';
import EditorManager from '../../logic/managers/EditorManager';
import UiManager from '../../logic/managers/UiManager';

const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 10;
const TOOLTIP_OFFSET_H = 20;

export default defineComponent({
  name: 'AssetLink',
  components: {
    ProjectLink,
    AssetTooltip: defineAsyncComponent(() => import('./AssetTooltip.vue')),
    DropdownContainer,
    AssetIcon,
  },
  props: {
    project: { type: Object as PropType<ProjectInfoForLink>, required: true },
    asset: { type: Object as PropType<AssetLink>, required: true },
    target: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    openPopup: { type: Boolean, default: false },
    exact: { type: Boolean, default: false },
    showTooltip: { type: Boolean, default: true },
    showIcon: { type: Boolean, default: true },
    showLoading: { type: Boolean, default: true },
    tooltipShowPath: { type: Boolean, default: true },
  },
  emits: ['click'],
  data() {
    return {
      hoveredCoord: null as { x: number; y: number } | null,
      hoveredTimer: null as NodeJS.Timeout | null,
    };
  },
  computed: {
    isLoadingShown() {
      return this.cachedAsset === undefined && this.showLoading;
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
    displayingAssetTitle(): string {
      const asset_title = this.cachedAsset
        ? this.cachedAsset.title
        : this.asset.title
          ? this.asset.title
          : (this.asset.name ?? '');
      return convertTranslatedTitle(asset_title ?? '', (key) => this.$t(key));
    },
    cachedAsset() {
      const cached = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(this.asset.id);
      if (cached === undefined) {
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetShortInCache(this.asset.id);
      }
      return cached;
    },
    hasGddAccess() {
      const role = this.$getAppManager()
        .get(ProjectManager)
        .getUserRoleInProject();
      if (role) return true;
      const project = this.$getAppManager()
        .get(ProjectManager)
        .getProjectInfo();
      if (!project) return false;
      return project.isPublicGdd;
    },
    assetNotFound(): boolean {
      return this.hasGddAccess && this.cachedAsset === null;
    },
  },
  unmounted() {
    this.hideTooltip();
  },
  methods: {
    makeAnchorTagId,
    async onClick(e: MouseEvent) {
      this.hideTooltip();
      this.$emit('click', e);
      if (this.assetNotFound) {
        e.preventDefault();
        return;
      }
      if (e.defaultPrevented) {
        return;
      }
      if (!this.openPopup) {
        return;
      }
      e.preventDefault();

      const open_blank = e.ctrlKey || e.metaKey;

      e.preventDefault();

      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.$getAppManager()
            .get(EditorManager)
            .openAsset(
              this.asset.id,
              open_blank ? 'new-tab' : 'popup',
              this.asset.blockId,
              this.asset.anchor ? this.asset.anchor : undefined,
            );
        });
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

.AssetLink {
  display: inline-flex;
  align-items: center;
  vertical-align: bottom;

  &:before {
    margin-right: 2px;
    position: relative;
    font-size: 14px;
    display: inline-block;
  }
  &.state-loading:before {
    content: '\eec6';
    font-family: 'remixicon' !important;
    font-style: normal;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    animation: AssetLink-asset-spin 1s linear infinite;
  }
  &.state-error {
    color: var(--color-main-error);
    &:before {
      content: '\ECA0';
      font-family: 'remixicon' !important;
      font-style: normal;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  }
}
@keyframes AssetLink-asset-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.AssetLink-tooltip {
  max-width: min(400px, 80dvw);
}
.AssetLink-title {
  flex: 1;
}
</style>

<style lang="scss">
.AssetLink-tooltip-container,
.AssetLink-tooltip {
  pointer-events: none;
}
</style>
