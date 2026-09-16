<template>
  <imc-format-text-presenter
    class="TextPropEditor"
    :model-value="displayValue"
  ></imc-format-text-presenter>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
  castAssetPropValueToText,
  joinAssetPropValueTexts,
  truncateAssetPropValueText,
  type AssetPropValue,
} from '../../logic/types/Props';
import ImcFormatTextPresenter from '../Common/ImcFormatTextPresenter.vue';

export default defineComponent({
  name: 'TextPropPresenter',
  components: {
    ImcFormatTextPresenter,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    cutLength: {
      type: Number,
      default: 0,
    },
  },
  emits: ['update:modelValue'],
  computed: {
    displayValue() {
      if (this.cutLength <= 0) {
        return this.modelValue;
      }
      const truncated = truncateAssetPropValueText(
        castAssetPropValueToText(this.modelValue),
        this.cutLength,
      );
      if (!truncated.truncated) return truncated.result;
      else return joinAssetPropValueTexts(truncated.result, '...');
    },
  },
});
</script>

<style lang="scss" scoped>
.TextPropEditor {
  padding: 5px;
}
</style>
