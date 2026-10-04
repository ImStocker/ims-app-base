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
  AssetPropType,
  castAssetPropValueToString,
  castAssetPropValueToText,
  getAssetPropType,
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
    isRichText(): boolean {
      return getAssetPropType(this.modelValue) === AssetPropType.TEXT;
    },
    displayValue() {
      if (this.cutLength <= 0) {
        return this.modelValue;
      }
      const truncated = truncateAssetPropValueText(
        castAssetPropValueToText(this.modelValue),
        this.cutLength,
      );
      const value = truncated.truncated
        ? joinAssetPropValueTexts(truncated.result, '...')
        : truncated.result;
      // Truncation always yields a TEXT value; keep plain strings as strings
      // so markdown reaches the markdown presenter.
      return this.isRichText ? value : castAssetPropValueToString(value);
    },
  },
});
</script>

<style lang="scss" scoped>
.TextPropEditor {
  padding: 5px;
}
</style>
