<template>
  <div
    v-if="info && info.completeTrack && !info.isAbstract"
    class="AssetCompletionCheckWidget is-button is-button-icon"
    @click="openCompletionDialog"
  >
    <task-checkbox
      :model-value="completion.done"
      :loading="dirtyCompleteSet !== undefined"
      :disabled="!canEdit"
      @update:model-value="setComplete($event)"
      @click.stop
    ></task-checkbox>
    <span
      v-if="!completion.done"
      class="AssetCompletionCheckWidget-notCompleted"
    >
      <template v-if="completion.percent === null">
        {{ $t('asset.completion.progressNotCompleted') }}
      </template>
      <template v-else>
        {{ $t('asset.completion.progressCompletion') }}:
        {{ completion.percent }}%
      </template>
    </span>
    <span v-else class="AssetCompletionCheckWidget-completed">
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
import TaskCheckbox from '../../Common/TaskCheckbox.vue';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import { getCompletionDisplay, setAssetCompleted } from './AssetCompletion';
import UiManager from '../../../logic/managers/UiManager';
import type { AssetPreviewInfo } from '../../../logic/types/AssetsType';
import AssetCompletionMilestoneBadge from './AssetCompletionMilestoneBadge.vue';
import DialogManager from '../../../logic/managers/DialogManager';
import AssetCompletionDialog from './AssetCompletionDialog.vue';
import { AssetRights } from '../../../logic/types/Rights';

export default defineComponent({
  name: 'AssetCompletionCheckWidget',
  components: {
    TaskCheckbox,
    AssetCompletionMilestoneBadge,
  },
  props: {
    assetId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      dirtyCompleteSet: undefined as boolean | undefined,
    };
  },
  computed: {
    canEdit() {
      return (this.info?.rights ?? AssetRights.NO) >= AssetRights.FILL_EMPTY;
    },
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
      return getCompletionDisplay(this.info, this.dirtyCompleteSet);
    },
  },
  methods: {
    async setComplete(val: boolean) {
      if (!this.info) return;
      this.dirtyCompleteSet = val;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await setAssetCompleted(this.$getAppManager(), this.assetId, val);
        });
      if (val === this.dirtyCompleteSet) {
        this.dirtyCompleteSet = undefined;
      }
    },
    async openCompletionDialog() {
      await this.$getAppManager()
        .get(DialogManager)
        .show(AssetCompletionDialog, {
          assetId: this.assetId,
        });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetCompletionCheckWidget {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}
.AssetCompletionCheckWidget-notCompleted {
  color: var(--local-sub-text-color);
  user-select: none;
}
.AssetCompletionCheckWidget-completed {
  color: var(--color-ready-value);
}
.AssetCompletionCheckWidget-notCompleted,
.AssetCompletionCheckWidget-completed {
  white-space: nowrap;
}
</style>
