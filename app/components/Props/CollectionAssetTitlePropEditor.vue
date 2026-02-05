<template>
  <string-prop-editor
    ref="input"
    class="CollectionAssetTitlePropEditor"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @input-value="$emit('inputValue', $event)"
  ></string-prop-editor>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import StringPropEditor from './StringPropEditor.vue';

export default defineComponent({
  name: 'CollectionAssetTitlePropEditor',
  components: {
    StringPropEditor,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter', 'inputValue'],
  methods: {
    focus() {
      const input = this.$refs.input as InstanceType<typeof StringPropEditor>;
      if (!input) return;
      input.focus();
    },
    selectAll() {
      const input = this.$refs.input as InstanceType<typeof StringPropEditor>;
      if (!input) return;
      input.selectAll();
    },
    focusEnd() {
      const input = this.$refs.input as InstanceType<typeof StringPropEditor>;
      if (!input) return;
      input.focusEnd();
    },
  },
});
</script>

<style lang="scss" scoped></style>
