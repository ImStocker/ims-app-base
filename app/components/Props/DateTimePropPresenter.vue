<template>
  <string-prop-presenter
    class="DateTimePropPresenter"
    :model-value="displayingValue"
  ></string-prop-presenter>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import { formatDateTime } from '../../logic/utils/format';
import StringPropPresenter from './StringPropPresenter.vue';
import UiManager from '../../logic/managers/UiManager';

export default defineComponent({
  name: 'DateTimePropPresenter',
  components: {
    StringPropPresenter,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: [],
  computed: {
    displayingValue() {
      const str = castAssetPropValueToString(this.modelValue);
      if (/^\d\d\d\d-\d\d-\d\d/.test(str)) {
        return formatDateTime(
          str,
          this.$getAppManager().get(UiManager).getLanguage(),
        );
      }
      return str;
    },
  },
});
</script>

<style lang="scss" scoped>
.DateTimePropPresenter {
  padding: 5px;
}
</style>
