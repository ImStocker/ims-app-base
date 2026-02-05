<template>
  <div class="SelectExportFormat">
    <ims-select
      v-model="ownModelValue"
      :options="formats"
      :get-option-label="(opt: any) => opt.title"
      :get-option-key="(opt: any) => opt.id"
      :reduce="(opt: any) => opt.id"
      class="SelectExportFormat-select"
    ></ims-select>
    <button
      class="is-button is-button-icon-outlined SelectExportFormat-settings"
      @click="openFormatsSettings"
    >
      <i class="ri-settings-3-fill"></i>
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import ImsSelect from '../Common/ImsSelect.vue';
import ExportFormatManager, {
  type ExportFormatWithId,
} from '../../logic/managers/ExportFormatManager';
import DialogManager from '../../logic/managers/DialogManager';
import EditFormatsDialog from './EditFormatsDialog.vue';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';
import { getWorkspaceBaseAssetId } from '../Sync/getBaseAsset';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import { filterFormatsByAssetType } from './filterFormatsByAssetType';

export default defineComponent({
  name: 'SelectExportFormat',
  components: {
    ImsSelect,
  },
  props: {
    modelValue: {
      type: String,
      default: null,
    },
    assetTypeFilter: {
      type: Object as PropType<AssetPropWhere | null>,
      default: null,
    },
  },
  emits: ['update:model-value'],
  data() {
    return {
      formats: [] as ExportFormatWithId[],
    };
  },
  computed: {
    ownModelValue: {
      get() {
        return this.modelValue;
      },
      set(val: string) {
        this.$emit('update:model-value', val);
      },
    },
  },
  watch: {
    assetTypeFilter: {
      async handler() {
        await this.load();
      },
      deep: true,
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      this.formats = this.$getAppManager()
        .get(ExportFormatManager)
        .getExportFormats();
      if (this.assetTypeFilter) {
        let asset_id = null as null | string;
        if (typeof this.assetTypeFilter?.workspaceids === 'string') {
          asset_id = await getWorkspaceBaseAssetId(
            this.$getAppManager(),
            this.assetTypeFilter.workspaceids,
          );
        }
        if (typeof this.assetTypeFilter?.typeids === 'string') {
          asset_id = this.assetTypeFilter.typeids;
        }
        if (asset_id) {
          const base_asset = await this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetShortViaCache(asset_id);
          if (base_asset) {
            this.formats = filterFormatsByAssetType(
              this.$getAppManager(),
              this.formats,
              base_asset,
            );
          }
        }
      }
    },
    async openFormatsSettings() {
      const res = await this.$getAppManager()
        .get(DialogManager)
        .show(EditFormatsDialog, {
          selectable: true,
          assetTypeFilter: this.assetTypeFilter,
          actionType: 'export',
        });
      if (res && res.formatId) {
        if (this.formats.find((el) => el.id !== res.formatId)) {
          this.load();
        }
        this.ownModelValue = res.formatId;
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.SelectExportFormat {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  .SelectExportFormat-select {
    width: 100%;
  }
  .SelectExportFormat-settings {
    flex-shrink: 0;
  }
}
</style>
