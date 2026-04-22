<template>
  <fully-filled-page
    :bread-crumbs="breadCrumbs"
    class="without-border AssetFullPageLayout"
  >
    <template #header>
      <div class="AssetFullPageLayout-header">
        <asset-system-panel
          v-if="isSystemAsset"
          :current-asset-full="currentAssetFull!"
        ></asset-system-panel>
        <asset-page-header ref="header" :vm="vm"></asset-page-header>
      </div>
    </template>
    <div class="AssetFullPageLayout-active-element tiny-scrollbars">
      <asset-full-editor
        ref="editor"
        class="AssetsPageContent-active-element-editor"
        :asset-editor="vm.assetFullEditorVM"
        :show-comments="true"
        :request-root-toolbar-target="requestToolbarTarget"
      >
      </asset-full-editor>
    </div>
  </fully-filled-page>
</template>

<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import FullyFilledPage from '../../Common/FullyFilledPage.vue';
import type { AssetPageVM } from '../../../logic/vm/AssetPageVM';
import AssetFullEditor from '../Editor/AssetFullEditor.vue';
import AssetPageHeader from '../Editor/AssetPageHeader.vue';
import type { BreadCrumbsEntity } from '../../../logic/types/BreadCrumbs';
import ProjectManager from '../../../logic/managers/ProjectManager';
import AssetSystemPanel from '../AssetSystemPanel.vue';

export default defineComponent({
  name: 'AssetFullPageLayout',
  components: {
    FullyFilledPage,
    AssetFullEditor,
    AssetPageHeader,
    AssetSystemPanel,
  },
  props: {
    vm: {
      type: Object as PropType<UnwrapRef<AssetPageVM>>,
      required: true,
    },
    breadCrumbs: {
      type: Array as PropType<BreadCrumbsEntity[]>,
      default: null,
    },
  },
  emits: ['delete'],
  computed: {
    isSystemAsset() {
      return this.currentAssetFull
        ? this.currentAssetFull.projectId !== this.projectInfo?.id
        : false;
    },
    currentAssetFull() {
      return this.vm.assetFullEditorVM.getOpenedAssetFull();
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
  methods: {
    async requestToolbarTarget(): Promise<HTMLElement | null> {
      const header = this.$refs['header'] as InstanceType<
        typeof AssetPageHeader
      > | null;
      if (!header) return null;
      return await header.requestToolbarTarget();
    },
    async revealAssetBlock(blockId: string, anchor?: string): Promise<boolean> {
      const editor = this.$refs['editor'] as InstanceType<
        typeof AssetFullEditor
      > | null;
      if (!editor) return false;
      return editor.revealAssetBlock(blockId, anchor);
    },
  },
});
</script>

<style lang="scss" scoped>
.AssetFullPageLayout-active-element {
  height: 100%;
}
.AssetsPageContent-active-element-editor {
  height: 100%;
}
.AssetFullPageLayout-header {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
