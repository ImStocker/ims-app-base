<template>
  <caption-string :value="valueAsText" class="CaptionPropPresenter" />
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import CaptionString from '../Common/CaptionString.vue';

export default defineComponent({
  name: 'CaptionPropPresenter',
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
    valueAsText() {
      return castAssetPropValueToString(this.modelValue);
    },
  },
  mounted() {},
  methods: {},
});
</script>

<style lang="scss" scoped>
.CaptionPropPresenter {
  display: block;
  padding: 5px;
}
</style>
