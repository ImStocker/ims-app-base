<template>
  <div class="MarkdownEditor">
    <editor-block
      v-if="resolvedBlock"
      ref="editor"
      class="AssetBlockFullHeightEditor-block"
      :resolved-block="resolvedBlock"
      :asset-block-editor="assetBlockEditor"
      :readonly="isReadonly"
      :draggable="false"
      :display-mode="'page'"
      :hide-block-header="true"
      :hide-block-menu="true"
      :request-toolbar-target="requestRootToolbarTarget"
    ></editor-block>
  </div>
</template>
<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import ProjectManager from '#logic/managers/ProjectManager';
import type EditorBlock from '#components/Asset/Editor/EditorBlock.vue';

export default defineComponent({
  name: 'MarkdownEditor',
  components: {
    EditorBlock: defineAsyncComponent(
      () => import('#components/Asset/Editor/EditorBlock.vue'),
    ),
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    hiddenBlockNames: {
      type: Array<string>,
      default: () => [],
    },
    requestRootToolbarTarget: {
      type: Function as PropType<() => Promise<HTMLElement | null>>,
      required: true,
    },
  },
  emits: ['delete', 'update:is-dirty'],
  data() {
    return {
      saving: false,
      editorRefs: new Map<string, any>(),
    };
  },
  computed: {
    resolvedBlocks() {
      return this.assetBlockEditor.resolveBlocks();
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    resolvedBlock() {
      return this.resolvedBlocks.list.find((b) => b.type === 'markdown');
    },
    isReadonly() {
      return this.assetBlockEditor.getIsReadonly();
    },
    isDirty() {
      return this.assetBlockEditor.getHasChanges();
    },
  },
  watch: {
    isDirty() {
      this.$emit('update:is-dirty', this.isDirty);
    },
  },
  mounted() {
    this.$emit('update:is-dirty', this.isDirty);

    const editor = this.$refs['editor'] as InstanceType<
      typeof EditorBlock
    > | null;
    if (!this.isReadonly && editor) {
      editor.editBlock();
    }
  },
  methods: {
    async revealAssetBlock(blockId: string, anchor?: string): Promise<boolean> {
      if (!this.$el) {
        return false;
      }
      if (!anchor) return false;

      const element = window.document.getElementById(anchor);
      if (!element) {
        return false;
      }

      scrollIntoViewIfNeeded(element as HTMLElement, {
        behavior: 'smooth',
        scrollMode: 'if-needed',
      });

      return true;
    },
  },
});
</script>
<style lang="scss" scoped>
.MarkdownEditor {
  padding: 0 var(--root-editor-block-padding-right) 0
    var(--root-editor-block-padding-left);
  --editor-block-padding-left: 0px;
  --editor-block-padding-right: 0px;
}
</style>
