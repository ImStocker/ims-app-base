<template>
  <div class="DatePropEditor">
    <form-calendar
      class="is-button"
      :value="valueAsText"
      @change="setValue($event)"
    ></form-calendar>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import FormCalendar from '../Form/FormCalendar.vue';

export default defineComponent({
  name: 'DatePropEditor',
  components: {
    FormCalendar,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter'],
  computed: {
    valueAsText() {
      return castAssetPropValueToString(this.modelValue);
    },
  },
  mounted() {},
  methods: {
    setValue(val: string) {
      if (val) {
        const t = val.split('T');
        this.$emit('update:modelValue', t[0]);
      } else {
        this.$emit('update:modelValue', null);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.DatePropEditor {
  padding: 5px;
  --local-text-color: var(--button-text-color);

  :deep(.FormDatePicker-input) {
    padding: 0;
    border: none;
    font-size: 12px;
  }
  :deep(.FormDatePicker-box) {
    height: var(--button-font-size);
  }
  :deep(.FormDatePicker-input-i),
  :deep(.FormDatePicker-clear) {
    top: 0;
    color: var(--button-text-color);
  }
}
.DatePropEditor:deep(.FormDatePicker-input) {
  border: none;
  padding-left: 5px;
  font-size: inherit;
}
.DatePropEditor:deep(.vc-popover-content-wrapper) {
  z-index: 200;
}
</style>
