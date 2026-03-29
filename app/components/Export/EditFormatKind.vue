<template>
  <div class="EditFormatKind">
    <ims-select
      v-model="ownModelValue"
      class="EditFormatKind-input"
      :options="formatKinds[segmentType]"
      :get-option-label="(opt: any) => opt.title"
      :get-option-key="(opt: any) => opt.name"
      :reduce="(opt: any) => opt.name"
    >
    </ims-select>
    <button
      class="is-button is-button-icon-outlined EditFormatKind-button"
      :class="{
        loading: isLoading,
      }"
      :disabled="isLoading"
      :title="$t('importExport.formats.settings.formatPreview')"
      @click="openPreview"
    >
      <i class="ri-eye-fill"></i>
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent, inject, type PropType } from 'vue';
import { JsonSyncExportSegmentFormatOptions } from '../../logic/local-fs-sync/segments/JsonSyncExportSegment';
import ImsSelect from '../Common/ImsSelect.vue';
import type { AssetPropsPlainObject } from '../../logic/types/Props';
import EditFormatPreviewDialog from './EditFormatPreviewDialog.vue';
import type { ExportFormat } from '#logic/project-sub-contexts/ImportExportSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';
import { DialogSubContext } from '#logic/project-sub-contexts/DialogSubContext';

export default defineComponent({
  name: 'EditFormatKind',
  components: {
    ImsSelect,
  },
  props: {
    segmentType: {
      type: String as PropType<'json' | 'csv'>,
      default: null,
    },
    modelValue: {
      type: String as PropType<ExportFormat['kind']>,
      default: null,
    },
    getSampleAsset: {
      type: Function as PropType<
        (kind: ExportFormat['kind']) => Promise<AssetPropsPlainObject>
      >,
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
      isLoading: false,
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
    formatKinds() {
      return {
        json: [...this.jsonFormatOptions],
      };
    },
    jsonFormatOptions() {
      const vals = JsonSyncExportSegmentFormatOptions;
      return vals.map((val) => {
        return {
          name: val,
          title: this.$t('importExport.formats.formatTypes.' + val),
        };
      });
    },
  },
  methods: {
    async openPreview() {
      this.isLoading = true;
      try {
        const sample_asset = this.getSampleAsset
          ? await this.getSampleAsset(this.ownModelValue)
          : null;
        await this.projectContext
          .get(DialogSubContext)
          .show(EditFormatPreviewDialog, {
            sampleAsset: sample_asset,
          });
      } finally {
        setTimeout(() => {
          this.isLoading = false;
        }, 1);
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.EditFormatKind {
  display: flex;
  gap: 5px;
}
.EditFormatKind-input {
  flex: 1;
}
.EditFormatKind-button {
  flex-shrink: 0;
}
</style>
