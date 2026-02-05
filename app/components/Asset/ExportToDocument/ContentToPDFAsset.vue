<template>
  <div class="ContentToPDFAsset">
    <asset-block-viewer-root :asset-full="assetFull">
      <template #default="{ assetBlockEditor }">
        <template v-for="block of filteredBlocks" :key="block.id">
          <editor-block
            class="AssetBlockEditor-block"
            :resolved-block="block"
            :asset-block-editor="assetBlockEditor"
            :data-panel-name="block.name ?? block.id"
            :readonly="true"
            :draggable="false"
            :hide-block-menu="true"
            display-mode="print"
            @view-ready="viewReadyState.set(block.id, $event)"
            @vue:unmounted="viewReadyState.delete(block.id)"
          ></editor-block>
        </template>
      </template>
    </asset-block-viewer-root>
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import type {
  ExportingContentAsset,
  ExportingContentRenderState,
} from '../../../logic/utils/convertToPDF';
import { BLOCK_NAME_META } from '../../../logic/constants';
import AssetBlockViewerRoot from '../Editor/AssetBlockViewerRoot.vue';

export default defineComponent({
  name: 'ContentToPDFAsset',
  components: {
    EditorBlock: defineAsyncComponent(
      () => import('../../Asset/Editor/EditorBlock.vue'),
    ),
    AssetBlockViewerRoot,
  },
  props: {
    assetInfo: {
      type: Object as PropType<ExportingContentAsset>,
      required: true,
    },
    level: {
      type: Number,
      default: 1,
    },
    prevLevel: {
      type: String,
      default: '1.',
    },
  },
  emits: ['update:render-state'],
  data() {
    return {
      viewReadyState: new Map<string, boolean>(),
    };
  },
  computed: {
    assetFull() {
      return this.assetInfo.assetFull;
    },
    filteredBlocks() {
      const blocks = this.assetInfo.assetFull.resolvedBlocks;
      return blocks.list.filter((block) => {
        return block.name !== BLOCK_NAME_META;
      });
    },
    renderState(): ExportingContentRenderState {
      const render_state: ExportingContentRenderState = {
        renderedBlocks: 0,
        totalBlocks: 0,
      };
      for (const block of this.filteredBlocks) {
        const state = this.viewReadyState.get(block.id);
        if (state === undefined) {
          continue;
        }
        render_state.totalBlocks++;
        if (state !== false) render_state.renderedBlocks++;
      }
      return render_state;
    },
  },
  watch: {
    renderState() {
      this.$emit('update:render-state', this.renderState);
    },
  },
  mounted() {
    this.$emit('update:render-state', this.renderState);
  },
});
</script>
<style lang="scss" rel="stylesheet/scss" scoped></style>
