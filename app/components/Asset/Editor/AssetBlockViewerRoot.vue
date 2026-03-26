<template>
  <div class="AssetBlockViewerRoot">
    <slot :asset-block-editor="assetBlockEditor"></slot>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent, inject } from 'vue';
import { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import type { AssetFullInstanceR } from '../../../logic/types/AssetFullInstance';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

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
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    const assetBlockEditor = AssetBlockEditorVM.CreateInstance(
      projectContext,
      props.assetFull,
    );
    await assetBlockEditor.init();
    return {
      assetBlockEditor,
      projectContext,
    };
  },
  watch: {
    async assetFull() {
      if (this.assetBlockEditor) this.assetBlockEditor.destroy();
      this.assetBlockEditor = AssetBlockEditorVM.CreateInstance(
        this.projectContext,
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
