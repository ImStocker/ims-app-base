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
import { defineComponent, inject, type PropType } from 'vue';
import ImsSelect from '../Common/ImsSelect.vue';
import EditFormatsDialog from './EditFormatsDialog.vue';
import { getWorkspaceBaseAssetId } from '../Sync/getBaseAsset';
import { filterFormatsByAssetType } from './filterFormatsByAssetType';
import type { AssetPropValueSelection } from '../../logic/types/Props';
import type { ExportFormatWithId } from '#logic/project-sub-contexts/ImportExportSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';
import ImportExportSubContext from '#logic/project-sub-contexts/ImportExportSubContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import { DialogSubContext } from '#logic/project-sub-contexts/DialogSubContext';

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
    assetSelection: {
      type: Object as PropType<AssetPropValueSelection | null>,
      default: null,
    },
  },
  emits: ['update:model-value'],
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
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
    assetSelection: {
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
      this.formats = this.projectContext
        .get(ImportExportSubContext)
        .getExportFormats();
      if (this.assetSelection) {
        let asset_id = null as null | string;
        if (typeof this.assetSelection.Where?.workspaceids === 'string') {
          asset_id = await getWorkspaceBaseAssetId(
            this.projectContext,
            this.assetSelection.Where.workspaceids,
          );
        }
        if (typeof this.assetSelection.Where?.typeids === 'string') {
          asset_id = this.assetSelection.Where.typeids;
        }
        if (asset_id) {
          const base_asset = await this.projectContext
            .get(AssetSubContext)
            .getAssetShortViaCache(asset_id);
          if (base_asset) {
            this.formats = filterFormatsByAssetType(this.formats, base_asset);
          }
        }
      }
    },
    async openFormatsSettings() {
      const res = await this.projectContext
        .get(DialogSubContext)
        .show(EditFormatsDialog, {
          selectable: true,
          assetSelection: this.assetSelection,
          actionType: 'export',
        });
      if (res && res.formatId) {
        if (!this.formats.find((el) => el.id === res.formatId)) {
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
