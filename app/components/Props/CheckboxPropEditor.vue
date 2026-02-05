<template>
  <form-check-box
    class="CheckboxPropEditor"
    :different-value="differentValue"
    :value="value"
    :caption="caption"
    @input="$emit('update:modelValue', $event)"
  ></form-check-box>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import FormCheckBox from '../Form/FormCheckBox.vue';

export default defineComponent({
  name: 'CheckboxPropEditor',
  components: {
    FormCheckBox,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    differentValue: { type: Boolean, default: false },
    caption: { type: String, default: '' },
    default: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'blur'],
  computed: {
    value() {
      if (!this.default) {
        return (
          this.modelValue !== false &&
          this.modelValue !== null &&
          this.modelValue !== undefined &&
          this.modelValue !== 0
        );
      } else {
        return this.modelValue !== false && this.modelValue !== 0;
      }
    },
  },
  mounted() {},
});
</script>

<style lang="scss" scoped></style>
