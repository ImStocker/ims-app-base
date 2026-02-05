<template>
  <div class="SelectionPropEditor">
    <selection-prop-editor-input
      ref="input"
      class="SelectionPropEditor-input"
      :placeholder="placeholder"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template #append><slot name="append"></slot></template>
    </selection-prop-editor-input>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValueSelection } from '../../../logic/types/Props';
import SelectionPropEditorInput from './SelectionPropEditorInput.vue';

export default defineComponent({
  name: 'SelectionPropEditor',
  // inject: ['projectContext'],
  components: {
    SelectionPropEditorInput,
  },
  props: {
    modelValue: {
      type: [Object, null] as PropType<AssetPropValueSelection | null>,
      default: null,
    },
    placeholder: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  methods: {
    focus() {
      if (!this.$refs.input) {
        return;
      }
      (
        this.$refs.input as InstanceType<typeof SelectionPropEditorInput>
      ).focus();
    },
  },
});
</script>

<style lang="scss" scoped>
.SelectionPropEditor-input {
  width: 100%;
}
</style>
