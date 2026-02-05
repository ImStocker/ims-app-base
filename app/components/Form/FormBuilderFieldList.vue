<template>
  <div class="FormBuilderFieldList">
    <div
      v-for="(line, line_ind) of composedFields"
      :key="line_ind"
      class="FormBuilderFieldList-row Form-row FormBuilder-row"
      :class="line.className"
    >
      <div
        v-for="(cell, cell_ind) of line.cells"
        :key="cell_ind"
        class="FormBuilderFieldList-cell"
        :style="getCellStyle(cell)"
        :class="cell.className"
      >
        <slot name="field" :field="cell.field" :form-model="formModel">
          <form-builder-field
            class="FormBuilder-row-field"
            :field="cell.field"
            :form-model="formModel"
          ></form-builder-field>
        </slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type FormBuilderModelBase from './FormBuilderModelBase';
import FormBuilderComposerBase from './FormBuilderComposerBase';
import FormBuilderField from './FormBuilderField.vue';
import { defineComponent, type PropType } from 'vue';
import type { FormComposedCell, FormSchemaField } from './FormBuilderTypes';

export default defineComponent({
  name: 'FormBuilderFieldList',
  components: {
    FormBuilderField,
  },
  props: {
    fields: { type: Array<FormSchemaField>, required: true },
    formModel: {
      required: true,
      type: Object as PropType<FormBuilderModelBase>,
    },
    formComposer: { required: true, type: FormBuilderComposerBase },
  },
  computed: {
    composedFields() {
      return this.formComposer.composeFields(this.fields);
    },
  },
  methods: {
    getCellStyle(cell: FormComposedCell) {
      if (!cell.relativeWidth) return null;
      return `flex: ${cell.relativeWidth < 0 ? 'initial' : cell.relativeWidth}`;
    },
  },
});
</script>

<style lang="scss" scoped>
.FormBuilderFieldList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.FormBuilderFieldList-row {
  display: flex;
  gap: 10px;
}
.FormBuilderFieldList-cell:last-child {
  flex: 1;
  max-width: 100%;
}
</style>
