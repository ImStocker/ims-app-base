<template>
  <div class="EditFormatTemplate">
    <form-builder
      :form-schema="formSchema"
      :form-model="formModel"
    ></form-builder>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type {
  ExportFormat,
  ExportFormatField,
} from '../../logic/managers/ExportFormatManager';
import FormBuilderModelBindObject from '../Form/FormBuilderModelBindObject';
import type { FormSchema } from '../Form/FormBuilderTypes';
import EditFormatKind from './EditFormatKind.vue';
import EditFormatFields from './EditFormatFields.vue';
import FormBuilder from '../Form/FormBuilder.vue';
import type { AssetPropsPlainObject } from '../../logic/types/Props';

export default defineComponent({
  name: 'EditFormatTemplate',
  components: {
    FormBuilder,
  },
  props: {
    modelValue: {
      type: Object as PropType<Pick<ExportFormat, 'kind' | 'fields'>>,
      default: null,
    },
    segmentType: {
      type: String as PropType<ExportFormat['segmentType']>,
      default: null,
    },
    assetId: {
      type: String as PropType<string | null>,
      default: null,
    },
    getSampleAsset: {
      type: Function as PropType<
        (
          kind: ExportFormat['kind'],
          fields: ExportFormatField[],
        ) => Promise<AssetPropsPlainObject>
      >,
      default: null,
    },
  },
  emits: ['update:model-value'],
  computed: {
    formatKind: {
      get(): ExportFormat['kind'] {
        return this.modelValue.kind;
      },
      set(val: ExportFormat['kind']) {
        this.$emit('update:model-value', { ...this.modelValue, kind: val });
      },
    },
    formatFields: {
      get(): ExportFormat['fields'] {
        return this.modelValue.fields;
      },
      set(val: ExportFormat['fields']) {
        this.$emit('update:model-value', { ...this.modelValue, fields: val });
      },
    },
    formSchema(): FormSchema {
      return [
        this.segmentType !== 'csv'
          ? {
              caption: '',
              editor: EditFormatKind,
              editorProps: {
                segmentType: this.segmentType,
                getSampleAsset: this.getSampleAsset
                  ? (kind: ExportFormat['kind']) =>
                      this.getSampleAsset(kind, this.formatFields)
                  : null,
              },
              prop: 'formatKind',
            }
          : null,
        this.formatKind === 'selectFields' || this.segmentType === 'csv'
          ? {
              caption: '',
              editor: EditFormatFields,
              editorProps: {
                assetId: this.assetId,
              },
              prop: 'formatFields',
            }
          : null,
      ].filter((x) => x) as FormSchema;
    },
    formModel() {
      return new FormBuilderModelBindObject(this);
    },
  },
});
</script>
