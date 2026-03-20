<template>
  <div class="AssetHistory">
    <div
      v-if="showHeader"
      class="AssetHistory-close is-button-icon"
      @click="$emit('close')"
    >
      <i class="ri-close-line"></i>
    </div>
    <div v-if="showHeader" class="AssetHistory-header">
      {{ $t('gddPage.versionsHistory') }}
    </div>
    <div v-if="assetHistory.loadError" class="error-message-block">
      {{ assetHistory.loadError }}
    </div>
    <template v-else>
      <div
        class="AssetHistory-rows tiny-scrollbars"
        :class="{ 'AssetHistory-rows-short': daysLimit }"
      >
        <asset-history-row
          v-for="(historyRow, ind) of assetHistory.history.list"
          :key="historyRow.id"
          class="AssetHistory-row"
          :class="{
            'is-selected':
              assetHistory.selectedVersionId === historyRow.id ||
              (ind === 0 && !assetHistory.selectedVersionId),
          }"
          :history-row="historyRow"
          @click="
            assetHistory.setSelectedVersionId(ind === 0 ? null : historyRow.id)
          "
          @restore-version="restoreVersion($event)"
          @save-as-copy="saveAsCopy($event)"
        ></asset-history-row>
      </div>

      <div v-if="daysLimit" class="AssetHistory-main-proInfo">
        {{ $t('history.freeVersionLimit', { days: daysLimit }) }}
        <button class="is-button is-button-action accent" @click="upgrade()">
          {{ $t('history.upgradeToPro') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import UiManager from '../../../logic/managers/UiManager';
import AssetHistoryRow from './AssetHistoryRow.vue';
import ProjectManager from '../../../logic/managers/ProjectManager';
import type { AssetHistoryVM } from '#logic/vm/AssetHistoryVM';
import { openProjectLink } from '#logic/router/routes-helpers';
import { TASK_ASSET_ID } from '#logic/constants';
import TaskManager from '#logic/managers/TaskManager';

export default defineComponent({
  name: 'AssetHistory',
  components: {
    AssetHistoryRow,
  },
  props: {
    assetHistory: {
      type: Object as PropType<AssetHistoryVM>,
      required: true,
    },
    showHeader: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['close'],
  computed: {
    daysLimit() {
      const project_info = this.$getAppManager()
        .get(ProjectManager)
        .getProjectInfo();
      if (!project_info) return false;
      return project_info.license?.features.changeHistoryDays;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
  methods: {
    async upgrade() {
      await this.$getAppManager().get(UiManager).showUpgradeDialog();
    },
    async restoreVersion(version_id: string) {
      this.$emit('close');
      await this.assetHistory.restoreVersion(version_id);
    },
    async saveAsCopy(version_id: string) {
      const copy_assets = await this.assetHistory.saveAsCopy(version_id);
      if (!copy_assets) return;
      const copy_asset = copy_assets.objects.assetFulls[copy_assets.ids[0]];
      let assetLinkTo: any = {
        name: 'project-asset-by-id',
        params: {
          assetId: copy_asset.id,
        },
      };
      if (copy_asset.typeIds && copy_asset.typeIds.includes(TASK_ASSET_ID)) {
        const task_entity = this.$getAppManager()
          .get(TaskManager)
          .getTaskViaCacheSync(copy_asset.id);
        if (task_entity) {
          assetLinkTo = {
            name: 'project-tasks-task',
            params: {
              taskNum: task_entity.num,
            },
          };
        }
      }
      this.$emit('close');
      if (!this.projectInfo) return;
      openProjectLink(this.$getAppManager(), this.projectInfo, assetLinkTo);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';
.AssetHistory {
  max-width: 800px;
  position: relative;
  height: 100%;
}

.AssetHistory-rows {
  overflow: auto;
  height: calc(100% - 37px);
}

.AssetHistory-rows-short {
  height: calc(100% - 250px);
}

.AssetHistory-row {
  margin-bottom: 10px;
  cursor: pointer;
  border: 1px solid var(--panel-bg-color);
  &.is-selected {
    background-color: var(--panel-box-color);
    border: 1px solid var(--color-accent);
  }
}
.AssetHistory-row:hover {
  background-color: var(--panel-box-color);
}

.AssetHistory-main-proInfo {
  border: 1px dashed var(--color-accent);
  border-radius: 4px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  position: absolute;
  bottom: 0;

  .is-button {
    flex-shrink: 0;
  }
}
.AssetHistory-header {
  font-weight: bold;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}
.AssetHistory-close {
  position: absolute;
  right: -15px;
  top: -6px;
  font-size: 25px;
  cursor: pointer;
}
</style>
