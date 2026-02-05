<template>
  <caption-string
    :value="valueAsText"
    :title="enumValue ? enumValue.Name : ''"
    class="EnumPropPresenter"
  />
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type {
  AssetPropValue,
  AssetPropValueEnum,
} from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import CaptionString from '../Common/CaptionString.vue';

export default defineComponent({
  name: 'EnumPropPresenter',
  components: {
    CaptionString,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: [],
  computed: {
    enumValue() {
      if (this.modelValue && (this.modelValue as AssetPropValueEnum).Enum) {
        return this.modelValue as AssetPropValueEnum;
      } else {
        return null;
      }
    },
    valueAsText() {
      if (this.enumValue) {
        return this.enumValue.Title;
      }
      return castAssetPropValueToString(this.modelValue);
    },
  },
  mounted() {},
  methods: {},
});
</script>

<style lang="scss" scoped>
.EnumPropPresenter {
  display: block;
  padding: 5px;
}
</style>
