<template>
  <span v-if="!accountValue" class="ImcTextPropAccount state-error">
    {{ $t('common.notFound') }}: {{ stringValue }}
  </span>
  <span v-else class="ImcTextPropAccount">
    {{ formattedAccountName }}
  </span>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import {
  castAssetPropValueToString,
  type AssetPropValue,
  type AssetPropValueAccount,
} from '../../../logic/types/Props';

export default defineComponent({
  name: 'ImcTextPropAccount',
  props: {
    propValue: {
      type: Object as PropType<AssetPropValue>,
      default: null,
    },
  },
  computed: {
    accountValue() {
      if (
        this.propValue &&
        (this.propValue as AssetPropValueAccount).AccountId
      ) {
        return this.propValue as AssetPropValueAccount;
      } else {
        return null;
      }
    },
    stringValue(): string {
      return castAssetPropValueToString(this.propValue);
    },
    formattedAccountName() {
      return this.accountValue ? this.accountValue.Name : '';
    },
  },
});
</script>
<style lang="scss" scoped></style>
