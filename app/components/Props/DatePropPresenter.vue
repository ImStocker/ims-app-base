<template>
  <string-prop-presenter
    class="DatePropPresenter"
    :model-value="displayingValue"
  ></string-prop-presenter>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import { formatDate } from '../../logic/utils/format';
import StringPropPresenter from './StringPropPresenter.vue';
import UiManager from '../../logic/managers/UiManager';

export default defineComponent({
  name: 'DatePropPresenter',
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
        return formatDate(
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
.DatePropPresenter {
  padding: 5px;
}
</style>
