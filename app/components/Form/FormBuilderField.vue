<template>
  <div class="FormBuilderField">
    <div v-if="!editorComponentMeta.containsCaption" class="Form-row-header">
      <slot name="caption" :field="field">
        {{ field.caption }}
      </slot>
      <form-builder-field-tooltip
        v-if="field.tooltip"
        :message="field.tooltip"
      ></form-builder-field-tooltip>
    </div>
    <div v-if="field.editor" class="Form-row-input">
      <slot
        name="editor"
        :field="field"
        :form-model="formModel"
        :editor-component="field.editor"
        :editor-props="field.editorProps"
      >
        <component
          :is="field.editor"
          :caption="field.caption"
          :form-model="formModel"
          :form-prop="field.prop"
          v-bind="editorComponentProps"
          v-on="editorComponentListeners"
        >
          <template #tooltip>
            <form-builder-field-tooltip
              v-if="field.tooltip"
              class="FormBuilderField-tooltip"
              :message="field.tooltip"
            >
            </form-builder-field-tooltip>
          </template>
        </component>
      </slot>
    </div>
  </div>
</template>

<script lang="ts">
import type FormBuilderModelBase from './FormBuilderModelBase';
import FormBuilderFieldTooltip from './FormBuilderFieldTooltip.vue';
import { defineComponent, type PropType } from 'vue';
import type { FormSchemaField } from './FormBuilderTypes';

export default defineComponent({
  name: 'FormBuilderField',
  components: {
    FormBuilderFieldTooltip,
  },
  props: {
    field: { type: Object as PropType<FormSchemaField>, required: true },
    formModel: {
      required: true,
      type: Object as PropType<FormBuilderModelBase>,
    },
  },
  computed: {
    editorComponentMeta() {
      const component = this.field.editor;
      if (!component) return {};
      return component.meta ? component.meta : {};
    },
    editorComponentListeners() {
      return {
        [this.editorComponentMeta?.modelEvent
          ? this.editorComponentMeta.modelEvent
          : 'update:model-value']: (value) => this.onFieldChange(value),
      };
    },
    editorComponentProps() {
      return {
        ...this.field.editorProps,
        [this.editorComponentMeta?.modelProp
          ? this.editorComponentMeta.modelProp
          : 'modelValue']: this.fieldValue,
      };
    },
    fieldValue() {
      if (typeof this.field.prop === 'string') {
        return this.formModel.getValue(this.field.prop);
      } else {
        return this.field.prop.get(this.formModel);
      }
    },
  },
  methods: {
    onFieldChange(val: any) {
      if (typeof this.field.prop === 'string') {
        this.formModel.setValue(this.field.prop, val);
      } else {
        this.field.prop.set(this.formModel, val);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.FormBuilderField-tooltip {
  margin-left: 7px;
}
</style>
