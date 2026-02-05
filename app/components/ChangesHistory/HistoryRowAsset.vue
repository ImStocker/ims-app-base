<template>
  <div
    class="HistoryRowAsset"
    :class="{
      'state-deleted': assetShort && !!assetShort.deletedAt,
    }"
  >
    <asset-link
      v-if="projectInfo && assetShort"
      :project="projectInfo"
      :asset="assetShort"
      class="HistoryRowAsset-link"
      target="_blank"
    ></asset-link>
    {{ isLast ? ', ' : '' }}
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import AssetLink from '../Asset/AssetLink.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { ProjectFullInfo } from '../../logic/types/ProjectTypes';

export default defineComponent({
  name: 'HistoryRowAsset',
  components: {
    AssetLink,
  },
  props: {
    isLast: {
      type: Boolean,
      required: true,
    },
    assetId: {
      type: String,
      required: true,
    },
    projectInfo: {
      type: Object as PropType<ProjectFullInfo>,
      required: true,
    },
  },
  emits: ['rollbackChange', 'revertToState'],
  computed: {
    creatorAssetManager() {
      return this.$getAppManager().get(CreatorAssetManager);
    },
    assetShort() {
      return this.creatorAssetManager.getAssetShortViaCacheSync(this.assetId);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';

.HistoryRowAsset {
  display: flex;
  align-items: center;

  &.state-deleted {
    .HistoryRowAsset-link {
      text-decoration: line-through;
    }
  }
}

.HistoryRowAsset-link {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  text-decoration: none;
  padding: 1px 3px 3px 3px;
  display: inline-block;
  color: var(--local-link-color);
}

.HistoryRowAsset-icon {
  margin-right: 3px;
  @include asset-icons.asset-icons;
}
</style>
