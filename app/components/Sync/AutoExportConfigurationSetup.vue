<template>
  <div
    class="AutoExportConfigurationSetup"
    :class="{
      'state-empty': configurations.length === 0,
    }"
  >
    <div class="AutoExportConfigurationSetup-controls">
      <button
        class="is-button"
        :class="{
          accent: configurations.length === 0,
        }"
        @click="addConfiguration"
      >
        {{ $t('autoExport.addConfiguration') }}
      </button>
    </div>
    <template v-if="configurations.length > 0">
      <div class="AutoExportConfigurationSetup-list">
        <block-with-menu
          v-for="configuration of configurations"
          :key="configuration.id"
          class="AutoExportConfigurationSetup-list-one is-panel"
          :menu-list="getConfigurationMenu(configuration)"
        >
          <div class="AutoExportConfigurationSetup-configuration">
            <div class="AutoExportConfigurationSetup-configuration-title">
              {{ getConfigurationFormat(configuration.formatId)?.title }}
            </div>
            <div class="AutoExportConfigurationSetup-configuration-type">
              {{ getConfigurationFormat(configuration.formatId)?.segmentType }}
            </div>
            <div class="AutoExportConfigurationSetup-configuration-saveAs">
              → {{ configuration.saveAs }}
            </div>
          </div>
        </block-with-menu>
      </div>
      <div class="AutoExportConfigurationSetup-sync">
        <div class="AutoExportConfigurationSetup-sync-left">
          <button
            class="is-button accent"
            :class="{ loading: syncButtonLoading }"
            :disabled="syncDisabled || syncButtonLoading"
            @click="doSync(false)"
          >
            {{ $t('autoExport.exportButton') }}
          </button>
          <label>
            <input v-model="autoSyncEnabled" type="checkbox" />
            {{ $t('autoExport.exportAutomatically') }}
          </label>
        </div>
        <div class="AutoExportConfigurationSetup-sync-right">
          <button
            class="is-button"
            :disabled="syncDisabled"
            @click="downloadArchive()"
          >
            {{ $t('autoExport.copyAsArchive') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import EditConfigurationDialog from './EditConfigurationDialog.vue';
import LocalFsSyncManager from '../../logic/managers/LocalFsSyncManager';
import ExportFormatManager from '../../logic/managers/ExportFormatManager';
import UiManager, { ToastTypes } from '../../logic/managers/UiManager';
import { openBlobFile } from '../../logic/utils/dataUtils';
import DialogManager from '../../logic/managers/DialogManager';
import type { SyncLocalRootSegment } from '../../logic/local-fs-sync/SyncLocalRoot';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import BlockWithMenu from '../Common/BlockWithMenu.vue';

export default defineComponent({
  name: 'AutoExportConfigurationSetup',
  components: {
    BlockWithMenu,
  },
  data() {
    return {
      syncButtonLoading: false,
    };
  },
  computed: {
    configurations() {
      return this.$getAppManager()
        .get(LocalFsSyncManager)
        .getExportConfigurations();
    },
    syncDisabled() {
      return this.$getAppManager().get(LocalFsSyncManager).syncStatus.isSyncing;
    },
    autoSyncEnabled: {
      get() {
        return this.$getAppManager().get(LocalFsSyncManager).autosyncEnabled;
      },
      set(val: boolean) {
        this.$getAppManager().get(LocalFsSyncManager).autosyncEnabled = val;
      },
    },
    formats() {
      return this.$getAppManager().get(ExportFormatManager).getExportFormats();
    },
  },
  methods: {
    getConfigurationFormat(formatId: string) {
      return this.formats.find((el) => el.id === formatId);
    },
    async doSync(full: boolean) {
      this.syncButtonLoading = true;
      await this.$getAppManager()
        .get(UiManager)
        .showProgressToast(
          async (state) => {
            state({
              progress: 0,
            });
            const res = await this.$getAppManager()
              .get(LocalFsSyncManager)
              .sync(full, (p) => {
                state({
                  progress: p,
                });
              });
            if (res) {
              state({
                progress: 1,
                type: ToastTypes.SUCCESS,
              });
            }
          },
          {
            message: this.$t('fsSync.synchronization'),
          },
        );
      this.syncButtonLoading = false;
    },
    async downloadArchive() {
      await this.$getAppManager()
        .get(UiManager)
        .showProgressToast(
          async (state) => {
            state({
              progress: 0,
            });
            const res = await this.$getAppManager()
              .get(LocalFsSyncManager)
              .createArchive((p) => {
                state({
                  progress: p,
                });
              });
            if (res) {
              const blob = await res.generateAsync({ type: 'blob' });
              openBlobFile(blob, 'sync.zip');
              state({
                progress: 1,
                type: ToastTypes.SUCCESS,
              });
            }
          },
          {
            message: this.$t('fsSync.downloadArchivePrepare'),
          },
        );
    },
    async addConfiguration() {
      await this.$getAppManager()
        .get(DialogManager)
        .show(EditConfigurationDialog, {
          new: true,
        });
    },
    async changeConfiguration(configuration: SyncLocalRootSegment) {
      await this.$getAppManager()
        .get(DialogManager)
        .show(EditConfigurationDialog, {
          value: configuration,
        });
    },
    async exportOne(configuration: SyncLocalRootSegment) {
      await this.$getAppManager()
        .get(UiManager)
        .showProgressToast(
          async (state) => {
            state({
              progress: 0,
            });
            const res = await this.$getAppManager()
              .get(LocalFsSyncManager)
              .exportOne(configuration, (p) => {
                state({
                  progress: p,
                });
              });
            if (res) {
              openBlobFile(res.content, res.name);
              state({
                progress: 1,
                type: ToastTypes.SUCCESS,
              });
            }
          },
          {
            message: this.$t('fsSync.downloadFilePrepare'),
          },
        );
    },

    async deleteConfiguration(name: string) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const confirm = await this.$getAppManager()
            .get(DialogManager)
            .show(ConfirmDialog, {
              header: this.$t('fsSync.deleteConfiguration'),
              message: this.$t('fsSync.deleteConfigurationConfirm'),
            });
          if (confirm) {
            await this.$getAppManager()
              .get(LocalFsSyncManager)
              .deleteExportConfiguration(name);
          }
        });
    },
    getConfigurationMenu(configuration: SyncLocalRootSegment) {
      return [
        {
          icon: 'edit',
          title: this.$t('fsSync.editConfiguration'),
          action: () => this.changeConfiguration(configuration),
        },
        {
          icon: 'export',
          title: this.$t('fsSync.downloadResult'),
          action: () => this.exportOne(configuration),
        },
        {
          icon: 'delete',
          title: this.$t('fsSync.deleteConfiguration'),
          action: () => this.deleteConfiguration(configuration.id),
          danger: true,
        },
      ];
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AutoExportConfigurationSetup-controls {
  text-align: right;
  margin-bottom: 20px;
}
.AutoExportConfigurationSetup.state-empty {
  .AutoExportConfigurationSetup-controls {
    text-align: left;
  }
}
.AutoExportConfigurationSetup-configuration {
  display: flex;
  gap: 10px;
}
.AutoExportConfigurationSetup-list {
  margin-bottom: 20px;
}
.AutoExportConfigurationSetup-list-one {
  margin-bottom: 10px;
}

.AutoExportConfigurationSetup-sync {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
.AutoExportConfigurationSetup-sync-left,
.AutoExportConfigurationSetup-sync-right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
</style>
