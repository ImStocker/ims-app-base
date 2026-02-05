<template>
  <div class="FormBuilder">
    <slot
      v-if="!groupedFields.error"
      name="layout"
      :form-model="formModel"
      :form-composer="formComposer"
      :grouped-fields="groupedFields.groups"
    >
      <form-builder-layout
        :form-model="formModel"
        :form-composer="formComposer"
        :grouped-fields="groupedFields.groups"
      ></form-builder-layout>
    </slot>
    <slot v-else name="error">
      <div class="FormBuilder-error">{{ groupedFields.error }}</div>
    </slot>
  </div>
</template>

<script lang="ts">
import type FormBuilderModelBase from './FormBuilderModelBase';
import FormBuilderLayout from './FormBuilderLayout.vue';
import FormBuilderComposerBase from './FormBuilderComposerBase';
import type { FormSchema } from './FormBuilderTypes';
import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  name: 'FormBuilder',
  components: {
    FormBuilderLayout,
  },
  props: {
    formSchema: { required: true, type: Object as PropType<FormSchema> },
    formModel: {
      required: true,
      type: Object as PropType<FormBuilderModelBase>,
    },
    formComposer: {
      type: FormBuilderComposerBase,
      default: () => new FormBuilderComposerBase(),
    },
  },
  computed: {
    groupedFields() {
      try {
        return {
          groups: this.formComposer.groupFields(this.formSchema),
          error: null,
        };
      } catch (err: any) {
        return {
          groups: [],
          error: err.message,
        };
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.FormBuilder-error {
  color: var(--color-main-error);
}
</style>
