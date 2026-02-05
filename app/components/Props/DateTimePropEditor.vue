<template>
  <div class="DatePropEditor">
    <form-calendar
      :value="valueAsText"
      mode="dateTime"
      @change="setValue($event)"
    ></form-calendar>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import {
  castAssetPropValueToString,
  castAssetPropValueToTimestamp,
} from '../../logic/types/Props';
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
        this.$emit('update:modelValue', castAssetPropValueToTimestamp(val));
      } else {
        this.$emit('update:modelValue', null);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.DatePropEditor:deep(.FormDatePicker-input) {
  border: none;
  padding-left: 5px;
  font-size: inherit;
}
.DatePropEditor:deep(.vc-popover-content-wrapper) {
  z-index: 200;
}
</style>
