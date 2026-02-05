<template>
  <div
    v-if="assetEditor.loadDone && currentSingleAsset"
    class="AssetFullEditor"
  >
    <asset-block-editor-root
      ref="editorRoot"
      class="AssetFullEditor-common"
      :asset-full="currentSingleAsset"
      :toolbar-show-block-copy-paste="
        layoutDescriptor.props.toolbarShowBlockCopyPaste ?? true
      "
    >
      <template #default="{ assetBlockEditor }">
        <slot
          name="blockEditor"
          :asset-full="currentSingleAsset"
          :asset-block-editor="assetBlockEditor"
          :show-comments="showComments"
        >
          <component
            :is="layoutDescriptor.editorComponent"
            ref="editorComp"
            class="AssetFullEditor-blockEditor"
            :asset-block-editor="assetBlockEditor"
            :show-comments="showComments"
            :request-root-toolbar-target="requestRootToolbarTarget"
            :filter-blocks="filterBlocks"
            @update:is-dirty="$emit('update:is-dirty', $event)"
          />
        </slot>
      </template>
    </asset-block-editor-root>
  </div>
  <div v-else-if="assetEditor.loadDone" class="PageError">
    {{ $t('common.notFound') }}
  </div>
  <div v-else-if="assetEditor.loadError" class="PageError">
    ERROR: {{ assetEditor.loadError }}
  </div>
  <div v-else class="AssetFullEditor-load">
    <div class="loaderSpinner PageLoaderSpinner"></div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { AssetFullEditorVM } from '../../../logic/vm/AssetFullEditorVM';
import AssetBlockEditor from './AssetBlockEditor.vue';
import ProjectManager from '../../../logic/managers/ProjectManager';
import AssetBlockEditorRoot from './AssetBlockEditorRoot.vue';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import {
  BLOCK_NAME_LOCALE,
  BLOCK_NAME_PROPS,
  BLOCK_TYPE_LOCALE,
  BLOCK_TYPE_PROPS,
} from '../../../logic/constants';
import EditorManager from '../../../logic/managers/EditorManager';

export default defineComponent({
  name: 'AssetFullEditor',
  components: {
    AssetBlockEditor,
    AssetBlockEditorRoot,
  },
  props: {
    assetEditor: {
      type: Object as PropType<AssetFullEditorVM>,
      required: true,
    },
    showComments: {
      type: Boolean,
      default: () => false,
    },
    requestRootToolbarTarget: {
      type: Function as PropType<() => Promise<HTMLElement | null>>,
      required: true,
    },
  },
  emits: ['update:is-dirty'],
  data() {
    return {};
  },
  computed: {
    layoutDescriptor() {
      if (!this.currentSingleAsset) {
        return this.$getAppManager()
          .get(EditorManager)
          .getDefaultLayoutDescriptor();
      }
      return this.$getAppManager()
        .get(EditorManager)
        .getLayoutDescriptorForAsset(this.currentSingleAsset);
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    commonParent() {
      return this.assetEditor.getCommonParent();
    },
    isReadonly() {
      return this.assetEditor.getIsReadonly();
    },
    currentSingleAsset() {
      return this.assetEditor.getOpenedAssetFull();
    },
  },
  methods: {
    async saveChanges() {
      if (!this.$refs['editorRoot']) return;
      await (
        this.$refs['editorRoot'] as InstanceType<typeof AssetBlockEditorRoot>
      ).saveChanges();
    },
    async openLinksDialog() {
      if (!this.currentSingleAsset) {
        return;
      }
      await this.assetEditor.changeAssetLinks([this.currentSingleAsset.id]);
    },
    filterBlocks(block: ResolvedAssetBlock) {
      if (this.layoutDescriptor.props.headerLocaleButton) {
        if (
          block.name === BLOCK_NAME_LOCALE &&
          block.type === BLOCK_TYPE_LOCALE
        ) {
          return false;
        }
      }
      if (this.layoutDescriptor.props.headerPropsButton) {
        if (
          block.name === BLOCK_NAME_PROPS &&
          block.type === BLOCK_TYPE_PROPS
        ) {
          return false;
        }
      }
      return true;
    },
    async revealAssetBlock(blockId: string, anchor?: string): Promise<boolean> {
      const editor_comp = this.$refs['editorComp'] as any;
      if (!editor_comp) return false;
      if (!editor_comp.revealAssetBlock) return false;
      return editor_comp.revealAssetBlock(blockId, anchor);
    },
  },
});
</script>

<style lang="scss" scoped>
.AssetFullEditor {
  display: flex;
  flex-direction: column;
  --header-reserved-space: 50px;
}

.AssetFullEditor-common {
  display: flex;
  flex: 1;
  flex-direction: column;
  position: relative;
  z-index: 0;
  width: 100%;
  padding-bottom: 20px;
  box-sizing: border-box;
}
.AssetFullEditor-blockEditor {
  flex: 1;
}
</style>
