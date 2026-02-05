<template>
  <div class="HistoryRow">
    <div class="HistoryRow-header">
      <div class="HistoryRow-date">
        {{ createdAt }}
      </div>
      <div v-if="projectInfo" class="HistoryRow-content">
        {{ $t('history.changed') }}
        <history-row-asset
          v-for="(asset_id, index) in historyRow.assetIds"
          :key="asset_id"
          :project-info="projectInfo"
          :asset-id="asset_id"
          :is-last="index + 1 !== assetIdsCount"
        ></history-row-asset>
      </div>
      <div class="HistoryRow-user">
        <i class="ri-user-fill"></i>
        {{ historyRow.user.Name }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { formatDateTime } from '../../logic/utils/format';
import type { AssetGlobalHistoryDTO } from '../../logic/types/AssetHistory';
import UiManager from '../../logic/managers/UiManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { ProjectFullInfo } from '../../logic/types/ProjectTypes';
import HistoryRowAsset from './HistoryRowAsset.vue';

export default defineComponent({
  name: 'HistoryRow',
  components: {
    HistoryRowAsset,
  },
  props: {
    historyRow: {
      type: Object as PropType<AssetGlobalHistoryDTO>,
      required: true,
    },
  },
  emits: ['rollbackChange', 'revertToState'],
  computed: {
    creatorAssetManager() {
      return this.$getAppManager().get(CreatorAssetManager);
    },
    createdAt() {
      return formatDateTime(
        this.historyRow.createdAt,
        this.$getAppManager().get(UiManager).getLanguage(),
      );
    },
    ProjectManager() {
      return this.$getAppManager().get(ProjectManager);
    },
    projectInfo(): ProjectFullInfo | null {
      return this.ProjectManager.getProjectInfo();
    },
    assetIdsCount() {
      return this.historyRow.assetIds.length;
    },
  },
  methods: {
    getAssetShortById(asset_id: string) {
      return this.creatorAssetManager.getAssetShortViaCacheSync(asset_id);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.HistoryRow {
  padding: 10px;
  background: #2c2b29;
  border-radius: 4px;
  background-color: var(--local-box-color);
}

.HistoryRow-header {
  display: flex;
  gap: 10px;
}

.HistoryRow-content {
  flex: 1;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.HistoryRow-date {
  color: var(--local-sub-text-color);
}

.HistoryRow-user {
  color: var(--color-accent);
}
</style>
