<template>
  <div class="NumberPropEditor">
    <input
      ref="input"
      class="NumberPropEditor-input"
      type="number"
      :value="valueAsNumber"
      @change="emitChange($event)"
      @input="emitInput($event)"
    />
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToFloat } from '../../logic/types/Props';

export default defineComponent({
  name: 'NumberPropEditor',
  components: {},
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur', 'inputValue'],
  computed: {
    valueAsNumber() {
      return castAssetPropValueToFloat(this.modelValue);
    },
  },
  mounted() {},
  methods: {
    emitChange(event: Event) {
      const val = (event?.target as HTMLInputElement)?.value;
      this.$emit('update:modelValue', val !== '' ? parseFloat(val) : null);
    },
    emitInput(event: Event) {
      const val = (event?.target as HTMLInputElement)?.value;
      this.$emit('inputValue', val !== '' ? parseFloat(val) : null);
    },
    focus() {
      const input = this.$refs.input as HTMLInputElement;
      if (!input) return;
      input.focus();
    },
    selectAll() {
      const input = this.$refs.input as HTMLInputElement;
      if (!input) return;
      input.focus();
      input.select();
    },
    focusEnd() {
      const input = this.$refs.input as HTMLInputElement;
      if (!input) return;
      input.focus();
    },
  },
});
</script>

<style lang="scss" scoped>
.NumberPropEditor-input {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  padding: 5px;
  background: transparent;
  border: none;
  display: block;
  width: 100%;
}
</style>
