<template>
  <div class="FieldParamsEditor">
    <props-block-sheet
      v-if="forFieldTypeController"
      ref="sheet"
      :edit-mode="editMode"
      :form-def="structForm"
      :form-state="formState"
      @change-props="$emit('changeProps', $event)"
    ></props-block-sheet>
    <div v-else-if="forFieldType">Undefined type {{ forFieldType }}</div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineAsyncComponent, defineComponent } from 'vue';
import type { FieldTypeController } from '../../logic/types/FieldTypeController';
import { castAssetPropValueToString } from '../../logic/types/Props';
import type {
  PropsFormDef,
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';
import EditorManager from '../../logic/managers/EditorManager';

export default defineComponent({
  name: 'FieldParamsEditor',
  components: {
    PropsBlockSheet: defineAsyncComponent(
      () => import('~ims-plugin-base/blocks/PropsBlock/PropsBlockSheet.vue'),
    ),
  },
  props: {
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    field: {
      type: Object as PropType<PropsFormFieldDef>,
      required: true,
    },
    editMode: { type: Boolean, default: false },
  },
  emits: ['changeProps'],
  data() {
    return {};
  },
  computed: {
    forFieldType() {
      const key = `${this.field.propKey}`;
      const split = key.split('\\');
      split.pop();
      return castAssetPropValueToString(
        this.formState.combined[split.join('\\') + '\\type'],
      );
    },
    forFieldTypeController(): FieldTypeController | null {
      return (
        this.$getAppManager().get(EditorManager).getFieldTypesMap()[
          this.forFieldType
        ] ?? null
      );
    },
    structForm(): PropsFormDef | null {
      if (!this.forFieldTypeController) return null;

      const form_fields: PropsFormFieldDef[] = [];
      for (const parameter of this.forFieldTypeController.parameters) {
        form_fields.push({
          differentDefinition: false,
          index: form_fields.length,
          multiple: parameter.multiple,
          params: parameter.params,
          propTitle: parameter.title,
          type: parameter.type,
          propKey: this.field.propKey + '\\' + parameter.name,
          hint: parameter.hint,
        });
      }

      return {
        differentFieldsNum: 0,
        fields: form_fields,
      };
    },
  },
  mounted() {},
  methods: {},
});
</script>

<style lang="scss" scoped></style>
