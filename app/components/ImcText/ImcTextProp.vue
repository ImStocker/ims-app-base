<template>
  <span
    class="ImcTextProp"
    :class="{
      'type-inline': inline,
    }"
  >
    <span v-if="!isFilled" class="ImcTextProp-empty"></span>
    <imc-text-prop-account
      v-if="isAccount"
      :prop-value="propValue"
    ></imc-text-prop-account>
    <span v-else class="ImcTextProp-other">
      {{ stringValue }}
    </span>
  </span>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import {
  AssetPropType,
  castAssetPropValueToString,
  getAssetPropType,
  isFilledAssetPropValue,
  type AssetPropValue,
} from '../../logic/types/Props';
import ImcTextPropAccount from './ImcTextPropParts/ImcTextPropAccount.vue';

export default defineComponent({
  name: 'ImcTextProp',
  components: {
    ImcTextPropAccount,
  },
  props: {
    propValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    inline: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    stringValue() {
      return castAssetPropValueToString(this.propValue);
    },
    isAccount() {
      return getAssetPropType(this.propValue) === AssetPropType.ACCOUNT;
    },
    isFilled() {
      return isFilledAssetPropValue(this.propValue);
    },
  },
});
</script>
<style lang="scss"></style>
