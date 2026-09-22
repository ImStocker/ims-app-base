<template>
  <div class="AssetBlockFullHeightEditor ref-AssetBlockFullHeightEditor">
    <editor-block
      ref="editor"
      class="AssetBlockFullHeightEditor-block"
      :resolved-block="resolvedBlock"
      :asset-block-editor="assetBlockEditor"
      :readonly="isReadonly"
      :display-mode="'page'"
      :hide-block-header="true"
      :hide-block-menu="true"
      :request-toolbar-target="requestRootToolbarTarget"
    ></editor-block>
  </div>
</template>
<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import type EditorBlock from './EditorBlock.vue';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import { AssetRights } from '../../../logic/types/Rights';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import {
  BLOCK_NAME_LOCALE,
  BLOCK_NAME_META,
  BLOCK_TYPE_LOCALE,
} from '../../../logic/constants';

export default defineComponent({
  name: 'AssetBlockFullHeightEditor',
  components: {
    EditorBlock: defineAsyncComponent(() => import('./EditorBlock.vue')),
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
    resolvedBlocksFilteredList(): ResolvedAssetBlock[] {
      return this.resolvedBlocks.list.filter((item) => {
        if (item.name) {
          if (this.hiddenBlockNames.includes(item.name)) {
            return false;
          }
        }

        if (item.name) {
          if (
            item.name === BLOCK_NAME_LOCALE &&
            item.type === BLOCK_TYPE_LOCALE
          ) {
            return false;
          }
          if (item.name === BLOCK_NAME_META) {
            return false;
          }
        }
        return item.rights > AssetRights.NO;
      });
    },
    resolvedBlock() {
      return this.resolvedBlocksFilteredList[0];
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
      if (this.resolvedBlock.id !== blockId) {
        return false;
      }

      const editor = this.$refs['editor'] as InstanceType<
        typeof EditorBlock
      > | null;
      if (!editor) return false;
      return editor.revealBlock(anchor);
    },
  },
});
</script>
<style lang="scss" scoped>
.AssetBlockFullHeightEditor {
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  --editor-block-padding-left: 0px;
  --editor-block-padding-right: 0px;
  padding: 0px;

  & [block-type='chat'] {
    --editor-block-padding-left: 25px;
    --editor-block-padding-right: 25px;
  }
}

.AssetBlockFullHeightEditor-block {
  &,
  &:deep(.EditorBlock-content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  &:deep(.EditorBlockContent-component) {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
}
</style>
