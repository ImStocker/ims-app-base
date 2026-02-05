<template>
  <div class="AssetBlockViewerRoot">
    <slot :asset-block-editor="assetBlockEditor"></slot>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import type { AssetFullInstanceR } from '../../../logic/types/AssetFullInstance';
import { useAppManager } from '../../../composables/useAppManager';

export default defineComponent({
  name: 'AssetBlockViewerRoot',
  components: {},
  props: {
    assetFull: {
      type: Object as PropType<AssetFullInstanceR>,
      required: true,
    },
  },
  async setup(props) {
    const appManager = useAppManager();
    const assetBlockEditor = AssetBlockEditorVM.CreateInstance(
      appManager,
      props.assetFull,
    );
    await assetBlockEditor.init();
    return {
      assetBlockEditor,
    };
  },
  watch: {
    async assetFull() {
      if (this.assetBlockEditor) this.assetBlockEditor.destroy();
      this.assetBlockEditor = AssetBlockEditorVM.CreateInstance(
        this.$getAppManager(),
        this.assetFull,
      );
      await this.assetBlockEditor.init();
    },
  },
  async mounted() {
    this.assetBlockEditor.initClient(true);
  },
  unmounted() {
    this.assetBlockEditor.destroy();
  },
});
</script>
