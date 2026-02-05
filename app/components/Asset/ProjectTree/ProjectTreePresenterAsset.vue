<template>
  <div class="ProjectTreePresenterAsset">
    <block-with-menu
      v-if="asset && projectInfo"
      class="ProjectTreePresenter-row type-asset"
      :menu-list="getAssetMenu(asset)"
      menu-position="append"
    >
      <div
        v-if="(item.payload.inheritanceLevel ?? 0) > 0"
        class="ProjectTreePresenterAsset-inherit"
        :style="{
          '--ProjectTreePresenterAsset-inherit':
            item.payload.inheritanceLevel ?? 0,
        }"
      >
        <i class="ri-corner-down-right-fill"></i>
      </div>
      <div
        v-if="$slots.assetPrepend && asset"
        class="ProjectTreePresenter-prepend"
      >
        <slot name="assetPrepend" :asset="asset"></slot>
      </div>
      <asset-link
        :project="projectInfo"
        :asset="asset"
        class="ProjectTreePresenter-link"
        :show-loading="false"
        :tooltip-show-path="showProjectItemsPathInTooltip"
        :draggable="false"
        @click.prevent
      ></asset-link>
      <div
        v-if="$slots.assetAppend && asset"
        class="ProjectTreePresenter-append"
      >
        <slot name="assetAppend" :asset="asset"></slot>
      </div>
    </block-with-menu>
    <div v-else class="ProjectTreePresenterAsset-notFound">
      {{ item.title }}
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ProjectTreeItemPayload } from './ProjectTreePresenterBaseVM';
import type { TreePresenterItem } from '../../Common/TreePresenter/TreePresenter';
import type { AssetShort } from '../../../logic/types/AssetsType';
import type { ExtendedMenuListItem } from '../../../logic/types/MenuList';
import AssetLink from '../AssetLink.vue';
import BlockWithMenu from '../../Common/BlockWithMenu.vue';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../../logic/managers/ProjectManager';
import EditorManager from '../../../logic/managers/EditorManager';

export default defineComponent({
  name: 'ProjectTreePresenterAsset',
  components: {
    AssetLink,
    BlockWithMenu,
  },
  props: {
    item: {
      type: Object as PropType<TreePresenterItem<ProjectTreeItemPayload>>,
      required: true,
    },
    getAssetMenu: {
      type: Function as PropType<(asset: AssetShort) => ExtendedMenuListItem[]>,
      required: true,
    },
    showProjectItemsPathInTooltip: { type: Boolean, default: false },
    showAssetContent: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['contentRevealed'],
  computed: {
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    asset() {
      return this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(this.item.payload.id);
    },

    isContentRevealed() {
      return (
        this.showAssetContent &&
        !!this.$getAppManager()
          .get(EditorManager)
          .getRevealedContentIds(this.item.payload.id)
      );
    },
  },
  watch: {
    isContentRevealed() {
      if (this.isContentRevealed) {
        this.$emit('contentRevealed');
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ProjectTreePresenterAsset-notFound {
  color: var(--color-main-error);
}

.ProjectTreePresenterAsset-inherit {
  padding-left: calc(5px * var(--ProjectTreePresenterAsset-inherit));
}
</style>
