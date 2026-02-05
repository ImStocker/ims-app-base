<template>
  <imc-editor
    ref="input"
    class="TextPropEditor"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
    @enter="$emit('enter')"
    @pre-enter="$emit('preEnter')"
    v-on="{
      inputValue: onInputValue ? onInputValue : null,
    }"
  ></imc-editor>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import ImcEditor from '../ImcText/ImcEditor.vue';

export default defineComponent({
  name: 'TextPropEditor',
  components: {
    ImcEditor,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    boundsSelector: { type: String, default: '' },
    onInputValue: {
      type: Function,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter', 'input'],
  methods: {
    focus() {
      const input = this.$refs.input as InstanceType<typeof ImcEditor>;
      if (!input) return;
      input.focus();
    },
    focusEnd() {
      const input = this.$refs.input as InstanceType<typeof ImcEditor>;
      if (!input) return;
      input.focusEnd();
    },
    focusAt(clientX: number, clientY: number) {
      const input = this.$refs.input as InstanceType<typeof ImcEditor>;
      if (!input) return;
      input.focusAt(clientX, clientY);
    },
    selectAll() {
      const input = this.$refs.input as InstanceType<typeof ImcEditor>;
      if (!input) return;
      input.selectAll();
    },
  },
});
</script>

<style lang="scss" scoped>
.TextPropEditor {
  padding: 5px 5px;
}
</style>
