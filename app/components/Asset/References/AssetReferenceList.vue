<template>
  <div
    v-if="combinedReferences.length > 0"
    class="AssetReferenceList use-borderless-form"
  >
    <div v-if="header" class="AssetReferenceList-header">
      {{ header }}
    </div>
    <AssetLinkList
      :links="combinedReferences"
      :asset-block-editor="assetBlockEditor"
      :is-backlinks="isBacklinks"
    >
    </AssetLinkList>
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import type { AssetReferenceCommonEntity } from '../../../logic/types/AssetsType';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';

export default defineComponent({
  name: 'AssetReferenceList',
  components: {
    AssetLinkList: defineAsyncComponent(
      () => import('./AssetLinkList.vue') as any,
    ),
  },
  props: {
    header: {
      type: String,
      default: null,
    },
    combinedReferences: {
      type: Array<AssetReferenceCommonEntity>,
      required: true,
    },
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    isBacklinks: {
      type: Boolean,
      default: false,
    },
  },
  computed: {},
});
</script>

<style lang="scss" copied>
.AssetReferenceList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.AssetReferenceList-different {
  background: #2c2b29;
  padding: 15px 20px;
  text-align: center;
  font-style: italic;
  color: #999;
  border-radius: 4px;
}
.AssetReferenceList-header {
  font-size: 16px;
  font-weight: 700;
}
</style>
