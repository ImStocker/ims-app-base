<template>
  <dialog-content
    class="AssetHistoryDialog"
    :loading="!loadingDone && initialLoad"
    @escape-press="dialog.close()"
  >
    <template #header>
      {{ $t('gddPage.history') }}
    </template>
    <div v-if="loadingError" class="error-message-block">
      {{ loadingError }}
    </div>
    <template v-else>
      <asset-history-row
        v-for="historyRow of history.list"
        :key="historyRow.id"
        class="AssetHistoryDialog-row"
        :history-row="historyRow"
        @rollback-change="rollbackChange($event)"
        @revert-to-state="revertToState($event)"
      ></asset-history-row>

      <div v-if="daysLimit" class="AssetHistoryDialog-main-proInfo">
        {{ $t('history.freeVersionLimit', { days: daysLimit }) }}
        <button class="is-button is-button-action accent" @click="upgrade()">
          {{ $t('history.upgradeToPro') }}
        </button>
      </div>
    </template>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../../Dialog/DialogContent.vue';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import UiManager from '../../../logic/managers/UiManager';
import type { ApiResultListWithMore } from '../../../logic/types/ProjectTypes';
import type { AssetHistoryDTO } from '../../../logic/types/AssetHistory';
import AssetHistoryRow from './AssetHistoryRow.vue';
import DialogManager, {
  type DialogInterface,
} from '../../../logic/managers/DialogManager';
import ConfirmDialog from '../../Common/ConfirmDialog.vue';
import ProjectManager from '../../../logic/managers/ProjectManager';

type DialogProps = {
  assetId: string;
};

type DialogResult = null;

export default defineComponent({
  name: 'AssetHistoryDialog',
  components: {
    DialogContent,
    AssetHistoryRow,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      loadingError: null as string | null,
      loadingDone: false,
      initialLoad: true,
      history: {
        list: [],
        more: true,
      } as ApiResultListWithMore<AssetHistoryDTO>,
    };
  },
  computed: {
    daysLimit() {
      const project_info = this.$getAppManager()
        .get(ProjectManager)
        .getProjectInfo();
      if (!project_info) return false;
      return project_info.license?.features.changeHistoryDays;
    },
  },
  async mounted() {
    await this.reload();
    this.initialLoad = false;
  },
  methods: {
    async reload() {
      this.loadingDone = false;
      try {
        this.history = await this.$getAppManager()
          .get(CreatorAssetManager)
          .getHistory(this.dialog.state.assetId);
      } catch (err: any) {
        this.loadingError = err.message;
      } finally {
        this.loadingDone = true;
      }
    },
    async rollbackChange(change_id: string) {
      const historyRecord = this.history.list.find((r) => r.id === change_id);
      if (!historyRecord) return;
      const confirm = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('common.dialogs.confirm'),
          message: this.$t('assetHistory.rollbackChangeConfirm'),
        });
      if (!confirm) return;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(CreatorAssetManager)
            .changeAssets({
              where: {
                id: this.dialog.state.assetId,
              },
              set: historyRecord.undo,
            });
          await this.reload();
        });
    },
    async revertToState(change_id: string) {
      const historyRecordIndex = this.history.list.findIndex(
        (r) => r.id === change_id,
      );
      if (historyRecordIndex < 0) return;
      const _historyRecords = this.history.list.slice(
        0,
        historyRecordIndex + 1,
      );
      const confirm = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('common.dialogs.confirm'),
          message: this.$t('assetHistory.revertToStateConfirm'),
        });
      if (!confirm) return;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          throw new Error('NOT IMPLEMENTED');
        });
    },

    async upgrade() {
      await this.$getAppManager().get(UiManager).showUpgradeDialog();
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.AssetHistoryDialog {
  @include devices-mixins.device-type(pc) {
    width: 800px;
  }
}

.AssetHistoryDialog-row {
  margin-bottom: 10px;
}

.AssetHistoryDialog-main-proInfo {
  border: 1px dashed var(--color-accent);
  border-radius: 4px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;

  .is-button {
    flex-shrink: 0;
  }
}
</style>
