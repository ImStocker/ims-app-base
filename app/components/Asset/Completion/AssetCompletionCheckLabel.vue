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
import { defineComponent, inject } from 'vue';
import AssetCompletionMilestoneBadge from './AssetCompletionMilestoneBadge.vue';
import type { AssetPreviewInfo } from '../../../logic/types/AssetsType';
import { getCompletionDisplay } from './AssetCompletion';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'AssetCompletionCheckLabel',
  components: { AssetCompletionMilestoneBadge },
  props: {
    assetId: {
      type: String,
      required: true,
    },
  },
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    info(): AssetPreviewInfo | null | undefined {
      const info = this.projectContext
        .get(AssetSubContext)
        .getAssetPreviewViaCacheSync(this.assetId);
      if (info === undefined) {
        this.projectContext
          .get(AssetSubContext)
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
