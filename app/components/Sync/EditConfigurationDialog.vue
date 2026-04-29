<template>
  <dialog-content
    class="EditConfigurationDialog"
    :loading="isLoading"
    @enter-press="save"
    @escape-press="dialog.close()"
  >
    <div v-if="loadError" class="Dialog-error">
      {{ loadError }}
    </div>
    <template v-else>
      <div class="Dialog-body">
        <div class="EditConfigurationDialog-field">
          <div class="EditConfigurationDialog-field-caption">
            {{ $t('fsSync.configuration.includingAssets') }}
          </div>
          <div class="EditConfigurationDialog-field-control">
            <div class="EditConfigurationDialog-includingAssets">
              <div class="EditConfigurationDialog-includingAssets-row">
                <div class="EditConfigurationDialog-includingAssets-caption">
                  {{ $t('fsSync.configuration.includingAssetsFolder') }}
                </div>
                <div class="EditConfigurationDialog-includingAssets-control">
                  <select-workspace-combo-box
                    v-model="includingAssetsFolderValue"
                    :where="includingAssetsFolderWhere"
                    :placeholder="$t('importExport.formats.settings.assetsAll')"
                  ></select-workspace-combo-box>
                </div>
              </div>
              <div
                v-if="showAssetsType"
                class="EditConfigurationDialog-includingAssets-row"
              >
                <div class="EditConfigurationDialog-includingAssets-caption">
                  {{ $t('fsSync.configuration.includingAssetsType') }}
                </div>
                <div class="EditConfigurationDialog-includingAssets-control">
                  <select-asset-combo-box
                    v-model="includingAssetsTypeValue"
                    :where="includingAssetsTypeWhere"
                    :additional-options="baseAssetOptions"
                    :placeholder="$t('importExport.formats.settings.assetsAll')"
                  ></select-asset-combo-box>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="EditConfigurationDialog-field">
          <div class="EditConfigurationDialog-field-caption">
            {{ $t('importExport.formats.settings.selectFormat') }}
          </div>
          <div class="EditConfigurationDialog-field-control">
            <select-export-format
              v-model="format"
              :asset-selection="configuration.assetSelection"
            ></select-export-format>
          </div>
        </div>
        <div class="EditConfigurationDialog-field">
          <div class="EditConfigurationDialog-field-caption">
            {{ $t('fsSync.configuration.saveResultAs') }}
            <form-builder-field-tooltip
              :message="$t('fsSync.configuration.saveResultAsTooltip')"
            ></form-builder-field-tooltip>
            <i
              v-if="saveResultAsError"
              class="ri-error-warning-fill EditConfigurationDialog-field-error"
              :title="saveResultAsError"
            />
          </div>
          <div class="EditConfigurationDialog-field-control">
            <ims-input
              v-model="configuration.saveAs"
              :placeholder="computedSaveAs"
            ></ims-input>
          </div>
        </div>
      </div>

      <div class="Form-row-buttons">
        <div class="Form-row-buttons-center use-buttons-action">
          <button type="button" class="is-button" @click="dialog.close()">
            {{ $t('common.dialogs.cancel') }}
          </button>
          <button
            type="button"
            class="is-button accent EditConfigurationDialog-button-ok"
            :class="{ loading: isSaving }"
            :disabled="saveDisabled"
            @click="save"
          >
            {{ $t('common.dialogs.ok') }}
          </button>
        </div>
      </div>
    </template>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import SelectExportFormat from '../Export/SelectExportFormat.vue';
import SelectWorkspaceComboBox from '../Asset/SelectWorkspaceComboBox.vue';
import SelectAssetComboBox from '../Asset/SelectAssetComboBox.vue';
import FormBuilderFieldTooltip from '../Form/FormBuilderFieldTooltip.vue';
import ImsInput from '../Common/ImsInput.vue';
import DialogContent from '../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import {
  ASSET_SELECTION_DIAGRAM,
  ASSET_SELECTION_ENUM,
  ASSET_SELECTION_GAME_MECHANICS,
  ASSET_SELECTION_GAME_OBJECT,
  ASSET_SELECTION_LEVEL,
  ASSET_SELECTION_MARKDOWN,
  ASSET_SELECTION_SCRIPT,
  ASSET_SELECTION_STRUCTURE,
} from '../../logic/constants';
import ExportFormatManager from '../../logic/managers/ExportFormatManager';
import type { AssetPropValueSelection } from '../../logic/types/Props';
import LocalFsSyncManager from '../../logic/managers/LocalFsSyncManager';
import type {
  AssetForSelection,
  WorkspaceForSelection,
} from '../../logic/types/AssetsType';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import { getWorkspaceBaseAssetId } from './getBaseAsset';
import { getNextIndexWithTimestamp } from '../Asset/Editor/blockUtils';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import { getSyncExportSegments } from '../../logic/local-fs-sync/getSyncExportSegments';
import UiManager from '../../logic/managers/UiManager';
import type {
  SyncExportSegment,
  SyncExportSegmentCtr,
} from '../../logic/local-fs-sync/SyncExportSegment';
import type { SyncLocalRootSegment } from '../../logic/local-fs-sync/SyncLocalRoot';

type DialogProps = {
  value?: Partial<SyncLocalRootSegment>;
  new?: boolean;
};

type DialogResult = SyncLocalRootSegment | null;

export default defineComponent({
  name: 'EditConfigurationDialog',
  components: {
    DialogContent,
    ImsInput,
    FormBuilderFieldTooltip,
    SelectAssetComboBox,
    SelectWorkspaceComboBox,
    SelectExportFormat,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  emits: ['dialog-parameters'],
  data() {
    return {
      configuration: {
        id: '',
        saveAs: '',
        assetSelection: null,
        formatId: '',
      } as SyncLocalRootSegment,
      segmentCtrs: null as null | Map<
        string,
        SyncExportSegmentCtr<SyncExportSegment>
      >,
      isLoading: false,
      loadError: null as string | null,
      isEditing: false,
      isSaving: false,
      isAssetPreviewLoading: false,
      showAssetsType: true,
    };
  },
  computed: {
    baseAssetOptions() {
      const base_assets = [
        this.$appConfiguration.isDesktop ? ASSET_SELECTION_MARKDOWN : null,
        ASSET_SELECTION_GAME_OBJECT,
        ASSET_SELECTION_GAME_MECHANICS,
        ASSET_SELECTION_DIAGRAM,
        ASSET_SELECTION_SCRIPT,
        ASSET_SELECTION_LEVEL,
      ]
        .filter((x) => x)
        .map((x) => {
          return {
            ...x!,
            tooltip: this.$t('asset.createTooltips.' + x!.id),
          };
        });
      return [...base_assets, ASSET_SELECTION_STRUCTURE, ASSET_SELECTION_ENUM];
    },
    formats() {
      return this.$getAppManager().get(ExportFormatManager).getExportFormats();
    },
    format: {
      get() {
        return this.configuration.formatId;
      },
      set(val: string) {
        this.configuration.formatId = val;

        const format = this.formats.find((f) => f.id === val);
        if (!this.configuration.assetSelection?.Where) {
          this.configuration.assetSelection = {
            Where: {},
          } as AssetPropValueSelection;
        }
        this.configuration.assetSelection.Where.typeids =
          format?.assetType?.AssetId ?? undefined;
      },
    },
    saveDisabled() {
      return !this.computedSaveAs || !!this.saveResultAsError || this.isEditing;
    },
    existsConfigurations() {
      return this.$getAppManager()
        .get(LocalFsSyncManager)
        .getExportConfigurations();
    },
    includingAssetsFolderValue: {
      get(): WorkspaceForSelection | null {
        const workspace_id =
          typeof this.configuration.assetSelection?.Where?.workspaceids ===
          'string'
            ? this.configuration.assetSelection.Where.workspaceids
            : null;
        if (!workspace_id) return null;
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestWorkspaceInCache(workspace_id);
        return (
          this.$getAppManager()
            .get(CreatorAssetManager)
            .getWorkspaceByIdViaCacheSync(workspace_id) ?? null
        );
      },
      set(val: WorkspaceForSelection | null) {
        if (!this.configuration.assetSelection) {
          this.configuration.assetSelection = {
            Where: {},
          } as AssetPropValueSelection;
        }
        if (val) {
          this.configuration.assetSelection.Where.workspaceids = val.id;
          this.configuration.formatId = '';
        } else {
          delete this.configuration.assetSelection.Where.workspaceids;
        }
      },
    },
    includingAssetsTypeValue: {
      get(): AssetForSelection | null {
        const asset_id =
          typeof this.configuration.assetSelection?.Where?.typeids === 'string'
            ? this.configuration.assetSelection.Where.typeids
            : null;
        if (!asset_id) return null;
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetShortInCache(asset_id);
        return (
          this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetShortViaCacheSync(asset_id) ?? null
        );
      },
      set(val: AssetForSelection | null) {
        if (!this.configuration.assetSelection) {
          this.configuration.assetSelection = {
            Where: {},
          } as AssetPropValueSelection;
        }
        if (val) {
          this.configuration.assetSelection.Where.typeids = val.id;
        } else {
          delete this.configuration.assetSelection.Where.typeids;
        }
      },
    },
    includingAssetsFolderWhere() {
      return {
        insideId: this.gddWorkspaceId,
      };
    },
    includingAssetsTypeWhere() {
      const workspace_id =
        typeof this.configuration.assetSelection?.Where?.workspaceids ===
        'string'
          ? this.configuration.assetSelection.Where.workspaceids
          : null;
      return {
        workspaceids: workspace_id ? workspace_id : this.gddWorkspaceId,
      };
    },
    gddWorkspaceId() {
      return this.$getAppManager()
        .get(ProjectManager)
        .getWorkspaceIdByName('gdd');
    },
    saveResultAsError() {
      let saveResultAsError = null as string | null;
      if (/[\\/]/.test(this.computedSaveAs)) {
        saveResultAsError = this.$t('fsSync.configraitionSaveAsWrongSymbols');
      } else {
        if (
          (this.dialog.state.new ||
            this.dialog.state.value?.saveAs !== this.computedSaveAs) &&
          this.existsConfigurations.some(
            (c) => c.saveAs === this.computedSaveAs,
          )
        ) {
          saveResultAsError = this.$t('fsSync.configraitionSaveAsAlreadyUsed');
        }
        if (this.computedSaveAs === 'index') {
          saveResultAsError = this.$t(
            'fsSync.configurationSaeAsInvalidFileName',
          );
        }
      }
      return saveResultAsError;
    },
    computedSaveAs() {
      if (this.configuration.saveAs === 'index')
        return this.configuration.saveAs + '2';
      return this.configuration.saveAs;
    },
  },
  watch: {
    async includingAssetsFolderValue(
      newValue: WorkspaceForSelection | null,
      oldValue: WorkspaceForSelection | null,
    ) {
      if (newValue && oldValue && newValue.id === oldValue.id) return;
      if (newValue) {
        this.isLoading = true;
        const assetFolderIsCollection = !!(await getWorkspaceBaseAssetId(
          this.$getAppManager(),
          newValue.id,
        ));
        if (assetFolderIsCollection) {
          this.showAssetsType = !assetFolderIsCollection;
          this.includingAssetsTypeValue = null;
        }
        this.isLoading = false;
      } else {
        this.showAssetsType = true;
        this.includingAssetsTypeValue = null;
      }
    },
  },
  created() {
    this.configuration.index = getNextIndexWithTimestamp(
      this.existsConfigurations.length > 0
        ? this.existsConfigurations[this.existsConfigurations.length - 1].index
        : 0,
    );
    if (this.dialog.state.value) {
      Object.assign(this.configuration, this.dialog.state.value);
    }
  },
  async mounted() {
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
    await this.load();
  },
  methods: {
    convertTranslatedTitle,
    async load() {
      try {
        this.isLoading = true;
        this.loadError = null;
        this.segmentCtrs = await getSyncExportSegments();
      } catch (err: any) {
        this.loadError = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async save() {
      this.isSaving = true;
      if (this.saveDisabled) return;

      this.configuration.saveAs = this.computedSaveAs;

      if (!this.configuration.id) this.configuration.id = uuidv4();
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          if (
            this.dialog.state.value &&
            this.dialog.state.value.id !== undefined &&
            this.dialog.state.value.id !== this.configuration.id
          ) {
            await this.$getAppManager()
              .get(LocalFsSyncManager)
              .deleteExportConfiguration(this.dialog.state.value.id);
          }
          await this.$getAppManager()
            .get(LocalFsSyncManager)
            .saveExportConfiguration(this.configuration);
          this.dialog.close(this.configuration);
        });
      this.isSaving = false;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';

.EditConfigurationDialog {
  width: 400px;
}
.EditConfigurationDialog-field-caption {
  text-align: center;
  margin-bottom: 5px;
  position: relative;
  padding: 0px 20px;
}
.EditConfigurationDialog-field {
  margin-bottom: 10px;
}

.EditConfigurationDialog-field-error {
  color: var(--color-main-error);
  position: absolute;
  top: 1px;
  right: 0;
}

.EditConfigurationDialog-includingAssets-row {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}
.EditConfigurationDialog-includingAssets-caption {
  width: 60px;
}
.EditConfigurationDialog-includingAssets-control {
  flex: 1;
}
</style>
