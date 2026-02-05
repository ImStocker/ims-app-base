<template>
  <div v-if="info" class="AssetCompletionCheckLabel">
    <span
      v-if="!completion.done"
      class="AssetCompletionCheckLabel-notCompleted"
    >
      <template v-if="completion.percent === null">
        {{ $t('asset.completion.progressNotCompleted') }}
      </template>
      <template v-else>
        {{ $t('asset.completion.progressCompletion') }}:
        {{ completion.percent }}%
      </template>
    </span>
    <span v-else class="AssetCompletionCheckLabel-completed">
      <i class="ri-checkbox-fill"></i>
      {{ $t('asset.completion.progressCompleted') }}
    </span>
    <asset-completion-milestone-badge
      v-if="info.planMilestone"
      :milestone="info.planMilestone"
    ></asset-completion-milestone-badge>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import AssetCompletionMilestoneBadge from './AssetCompletionMilestoneBadge.vue';
import type { AssetPreviewInfo } from '../../../logic/types/AssetsType';
import { getCompletionDisplay } from './AssetCompletion';

export default defineComponent({
  name: 'AssetCompletionCheckLabel',
  components: { AssetCompletionMilestoneBadge },
  props: {
    assetId: {
      type: String,
      required: true,
    },
  },
  computed: {
    info(): AssetPreviewInfo | null | undefined {
      const info = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetPreviewViaCacheSync(this.assetId);
      if (info === undefined) {
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetPreviewInCache(this.assetId);
      }
      return info;
    },
    completion() {
      if (!this.info) return { done: false, percent: null };
      return getCompletionDisplay(this.info);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetCompletionCheckLabel {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.AssetCompletionCheckLabel-notCompleted {
  color: var(--local-sub-text-color);
}
.AssetCompletionCheckLabel-completed {
  color: var(--color-ready-value);
}
</style>
