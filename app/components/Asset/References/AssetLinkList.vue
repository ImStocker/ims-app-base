<template>
  <div v-if="links.length > 0" class="AssetLinkList use-borderless-form">
    <asset-link-list-item
      v-for="com_ref_entity of links"
      :key="com_ref_entity.targetAssetId"
      :combined-reference="com_ref_entity"
      :asset-block-editor="assetBlockEditor"
      :is-backlinks="isBacklinks"
    >
    </asset-link-list-item>
  </div>
  <div v-else-if="assets.length > 0" class="AssetLinkList use-borderless-form">
    <asset-link-list-item
      v-for="asset of assets"
      :key="asset.id"
      :asset="asset"
      :asset-block-editor="assetBlockEditor"
    >
    </asset-link-list-item>
  </div>
  <div v-else>
    {{ $t('gddPage.menu.empty') }}
  </div>
</template>

<script lang="ts">
import {
  defineAsyncComponent,
  defineComponent,
  type PropType,
  type UnwrapRef,
} from 'vue';
import type {
  AssetReferenceCommonEntity,
  AssetShort,
} from '../../../logic/types/AssetsType';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';

export default defineComponent({
  name: 'AssetLinkList',
  components: {
    AssetLinkListItem: defineAsyncComponent(
      () => import('./AssetLinkListItem.vue') as any,
    ),
  },
  props: {
    assets: {
      type: Array<AssetShort>,
      default: [],
    },
    links: {
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
});
</script>

<style lang="scss" copied>
.AssetLinkList {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 var(--editor-block-padding-right) 0
    var(--editor-block-padding-left);
}

.AssetLinkList-different {
  background: #2c2b29;
  padding: 15px 20px;
  text-align: center;
  font-style: italic;
  color: #999;
  border-radius: 4px;
}
</style>
