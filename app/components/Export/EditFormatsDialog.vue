<template>
  <dialog-content
    class="EditFormatsDialog"
    :loading="isLoading"
    @escape-press="dialog.close()"
  >
    <div class="Dialog-header EditFormatsDialog-header">
      {{ dialogHeader }}
    </div>
    <div v-if="loadError" class="Dialog-error">
      {{ loadError }}
    </div>
    <template v-else>
      <div class="EditFormatsDialog-content">
        <div class="EditFormatsDialog-content-list-column">
          <div class="EditFormatsDialog-content-search">
            <form-search
              :value="searchQuery"
              @change="searchQuery = $event"
            ></form-search>
          </div>
          <div v-if="baseAsset" class="EditFormatsDialog-content-filter">
            <span class="EditFormatsDialog-content-filter-caption">
              {{ $t('importExport.formats.formatsSuitable') }}:
              <span class="EditFormatsDialog-content-filter-caption-asset">
                <i
                  :class="[
                    'asset-icon-' +
                      (baseAsset.icon ? baseAsset.icon : 'file-fill'),
                  ]"
                  class="EditFormatsDialog-content-filter-caption-icon"
                ></i>
                {{ baseAsset.title }}
              </span>
            </span>
            <button
              class="is-button is-button-text EditFormatsDialog-content-filter-button"
              @click="toggleBaseAsset"
            >
              {{
                $t(
                  'importExport.formats.' +
                    (isBaseAssetFilterEnabled ? 'disable' : 'enable'),
                )
              }}
            </button>
          </div>
          <div class="EditFormatsDialog-content-list tiny-scrollbars">
            <div
              v-for="format of formatsComp"
              :key="format.id"
              class="EditFormatsDialog-content-list-item-wrapper is-button is-button-text"
              :class="{
                selected: format.id === selectedFormat?.id,
              }"
            >
              <button
                class="is-button is-button-text EditFormatsDialog-content-list-item"
                @click="
                  selectedFormat = format;
                  creatingFormat = null;
                "
              >
                <span>
                  {{ format.title }}
                </span>
                <span
                  v-if="creatingFormat?.id === format.id"
                  class="EditFormatsDialog-content-list-item-new"
                >
                  &nbsp;{{ ` — ${$t('importExport.formats.new')}` }}
                </span>
              </button>
              <div class="EditFormatsDialog-content-list-item-options">
                <button
                  class="is-button is-button-icon-small"
                  :class="{ loading: deletingFormatId === format.id }"
                  :disabled="deletingFormatId === format.id"
                  @click="deleteFormat(format.id)"
                >
                  <i class="ri-close-line"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="EditFormatsDialog-content-list-options">
            <button
              class="is-button is-button-action"
              :disabled="!!creatingFormat"
              @click="createFormat"
            >
              + {{ $t('importExport.formats.createFormat') }}
            </button>
          </div>
        </div>
        <hr class="EditFormatsDialog-content-sep" />
        <div class="EditFormatsDialog-content-settings">
          <edit-format
            v-if="selectedFormat"
            :format="selectedFormat"
            :base-asset="baseAssetComp"
            :is-saving="isFormatSaving"
            :is-new="
              !!(creatingFormat?.id && selectedFormat.id === creatingFormat?.id)
            "
            @change="saveFormat"
            @cancel="
              selectedFormat = null;
              creatingFormat = null;
            "
            @dirty="isFormatUnsaved = $event"
          ></edit-format>
        </div>
      </div>
    </template>
    <div class="EditFormatsDialog-footer">
      <div class="EditFormatsDialog-footer-buttons">
        <button class="is-button is-button-action" @click="dialog.close()">
          {{ $t('common.dialogs.close') }}
        </button>
        <button
          v-if="dialog.state.selectable && selectedFormat"
          class="is-button is-button-action accent"
          :disabled="isSelectButtonDisabled"
          @click="select"
        >
          {{ $t('common.dialogs.select') }}
        </button>
      </div>
      <div
        v-if="selectedFormatMismatchBaseAssetType && baseAsset"
        class="EditFormatsDialog-footer-caption"
      >
        {{ $t('importExport.formats.formatMismatchAssetType') }}
        <i
          :class="[
            'asset-icon-' + (baseAsset.icon ? baseAsset.icon : 'file-fill'),
          ]"
          class="EditFormatsDialog-content-filter-caption-icon"
        ></i>
        {{ baseAsset.title }}
      </div>
    </div>
  </dialog-content>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import EditFormat from './EditFormat.vue';
import ExportFormatManager, {
  type ExportFormatWithId,
} from '../../logic/managers/ExportFormatManager';
import { v4 as uuidv4 } from 'uuid';
import { generateNextUniqueNameNumber } from '../../logic/utils/stringUtils';
import DialogManager from '../../logic/managers/DialogManager';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import UiManager from '../../logic/managers/UiManager';
import FormSearch from '../Form/FormSearch.vue';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';
import { getWorkspaceBaseAssetId } from '../Sync/getBaseAsset';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { AssetShort } from '../../logic/types/AssetsType';
import {
  filterFormatsByAssetType,
  isFormatBelongToAsset,
} from './filterFormatsByAssetType';

type DialogProps = {
  selectable?: boolean;
  assetTypeFilter?: AssetPropWhere | null;
  actionType?: 'export' | 'import';
};

type DialogResult = {
  formatId?: string;
};

export default defineComponent({
  name: 'EditFormatsDialog',
  components: {
    DialogContent,
    EditFormat,
    FormSearch,
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
      isLoading: false,
      isFormatSaving: false,
      loadError: null as string | null,
      creatingFormat: null as null | ExportFormatWithId,
      selectedFormat: null as null | ExportFormatWithId,
      searchQuery: '',
      formats: [] as ExportFormatWithId[],
      deletingFormatId: null as string | null,
      baseAsset: null as null | AssetShort,
      isBaseAssetFilterEnabled: !!this.dialog.state.assetTypeFilter,
      isFormatUnsaved: false,
    };
  },
  computed: {
    selectedFormatMismatchBaseAssetType() {
      if (!this.selectedFormat) return false;
      if (!this.baseAsset) return false;
      return !isFormatBelongToAsset(this.selectedFormat, this.baseAsset);
    },
    isSelectButtonDisabled() {
      if (this.isFormatUnsaved) return true;
      if (!this.selectedFormat) return true;
      if (this.baseAsset) {
        return this.selectedFormatMismatchBaseAssetType;
      }
      return this.selectedFormat?.id === this.creatingFormat?.id;
    },
    dialogHeader() {
      return this.$t(
        'importExport.formats.selectFormats.' +
          (this.dialog.state.actionType
            ? this.dialog.state.actionType
            : 'export'),
      );
    },
    formatsComp() {
      return [this.creatingFormat, ...this.formats].filter(
        (x) => x,
      ) as ExportFormatWithId[];
    },
    baseAssetComp() {
      if (this.isBaseAssetFilterEnabled) {
        return this.baseAsset;
      }
      return null;
    },
  },
  async mounted() {
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
    await this.load();
  },
  methods: {
    async toggleBaseAsset() {
      this.isBaseAssetFilterEnabled = !this.isBaseAssetFilterEnabled;
      await this.load();
    },
    async saveFormat(format: ExportFormatWithId) {
      this.isFormatSaving = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(ExportFormatManager)
            .saveExportFormat(format);
          this.selectedFormat = format;
        });
      this.isFormatSaving = false;
      if (this.creatingFormat) this.creatingFormat = null;
      await this.load();
    },
    async deleteFormat(id: string) {
      const confirm = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('importExport.formats.deleteFormat'),
          message: this.$t('importExport.formats.deleteFormatConfirm'),
          yesCaption: this.$t('common.dialogs.delete'),
          danger: true,
        });
      if (!confirm) return;
      this.deletingFormatId = id;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(ExportFormatManager)
            .deleteExportFormat(id);
          this.selectedFormat = null;
        });
      this.deletingFormatId = null;

      await this.load();
    },
    async createFormat() {
      const format_titles = new Set(this.formats.map((a) => a.title));
      this.creatingFormat = {
        id: uuidv4(),
        assetType: this.baseAssetComp
          ? {
              AssetId: this.baseAssetComp.id,
              Title: this.baseAssetComp.title ?? '',
              Name: this.baseAssetComp.name ?? '',
            }
          : null,
        fields: [],
        kind: 'full',
        params: {},
        segmentType: '',
        title: generateNextUniqueNameNumber(
          'Untitled',
          (name) => !format_titles.has(name),
        ),
        jscode: '',
      };
      this.selectedFormat = this.creatingFormat;
    },
    async load() {
      try {
        this.isLoading = true;
        this.loadError = null;
        this.formats = this.$getAppManager()
          .get(ExportFormatManager)
          .getExportFormats();
        if (!this.isBaseAssetFilterEnabled) return;
        if (this.dialog.state.assetTypeFilter) {
          let asset_id = null as null | string;

          if (this.dialog.state.assetTypeFilter?.workspaceids) {
            const workspace_id = Array.isArray(
              this.dialog.state.assetTypeFilter.workspaceids,
            )
              ? this.dialog.state.assetTypeFilter.workspaceids[0]
              : this.dialog.state.assetTypeFilter.workspaceids;
            asset_id = await getWorkspaceBaseAssetId(
              this.$getAppManager(),
              workspace_id as string,
            );
          }

          if (typeof this.dialog.state.assetTypeFilter?.typeids === 'string') {
            asset_id = this.dialog.state.assetTypeFilter.typeids;
          }
          if (asset_id) {
            this.baseAsset = await this.$getAppManager()
              .get(CreatorAssetManager)
              .getAssetShortViaCache(asset_id);
            if (this.baseAsset) {
              this.formats = filterFormatsByAssetType(
                this.$getAppManager(),
                this.formats,
                this.baseAsset,
              );
            }
          }
        }
      } catch (err: any) {
        this.loadError = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    select() {
      if (this.selectedFormat) {
        this.dialog.close({ formatId: this.selectedFormat.id });
      }
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/asset-icons';

.EditFormatsDialog {
  width: 800px;
}
.EditFormatsDialog-content-filter-caption-icon,
.EditFormatsDialog-footer-caption {
  @include asset-icons.asset-icons;
}

.EditFormatsDialog-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;

  .EditFormatsDialog-footer-caption {
    color: var(--local-sub-text-color);
  }
}
.EditFormatsDialog-footer-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.EditFormatsDialog-content {
  display: flex;
  flex: 1;
  gap: 20px;
  height: 500px;
  margin-bottom: 20px;
}
.EditFormatsDialog-content-list-column {
  display: flex;
  flex-direction: column;
  width: 250px;
  gap: 10px;

  .EditFormatsDialog-content-list-options {
    display: flex;

    button {
      width: 100%;
      justify-content: center;
    }
  }
}
.EditFormatsDialog-content-filter {
  display: flex;
  flex-direction: column;

  .EditFormatsDialog-content-filter-button {
    font-size: 14px;
    width: fit-content;

    --button-padding: 0 !important;
    --button-bg-color: transparent !important;
    --button-border-color: transparent !important;
    --button-border-width: 0 !important;
    --button-border-style: none !important;
    --button-border-radius: 0 !important;
    --button-outline-color: transparent !important;
    --button-text-color: var(--local-sub-text-color) !important;
    text-decoration: underline;

    &:hover {
      text-decoration: none;
    }
  }

  .EditFormatsDialog-content-filter-caption {
    font-size: 14px;
    font-style: italic;
    color: var(--local-sub-text-color);

    .EditFormatsDialog-content-filter-caption-asset {
      white-space: nowrap;
    }
  }
}
.EditFormatsDialog-content-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
  overflow: hidden auto;

  .EditFormatsDialog-content-list-item-wrapper {
    position: relative;
    --button-padding: 0;
    &.selected {
      --button-border-color: var(--local-border-color);
    }

    &:hover {
      .EditFormatsDialog-content-list-item-options {
        button {
          opacity: 1 !important;
        }
      }
    }
  }

  .EditFormatsDialog-content-list-item-options {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 4px;

    button:not(.loading) {
      opacity: 0 !important;
    }
  }

  .EditFormatsDialog-content-list-item {
    width: 100%;
    height: 100%;
    --button-outline-width: 0px;
    --button-padding: 8px 30px 8px 10px;
    --button-bg-color: transparent !important;

    span {
      text-overflow: ellipsis;

      &.EditFormatsDialog-content-list-item-new {
        font-style: italic;
        color: var(--local-sub-text-color);
      }
    }
  }
}
.EditFormatsDialog-content-sep {
  border-color: var(--local-border-color);
  margin: 0;
}
.EditFormatsDialog-content-settings {
  flex: 1;
}
</style>
