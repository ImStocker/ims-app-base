<template>
  <div class="StringPropPresenter">
    <template v-if="valueAsText">{{ valueAsText }}</template
    ><template v-else>&nbsp;</template>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import { convertTranslatedTitle } from '../../logic/utils/assets';

export default defineComponent({
  name: 'StringPropPresenter',
  components: {},
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur'],
  computed: {
    valueAsText() {
      return convertTranslatedTitle(
        castAssetPropValueToString(this.modelValue),
        (...p) => this.$t(...p),
      );
    },
  },
  mounted() {},
  methods: {},
});
</script>

<style lang="scss" scoped>
.StringPropPresenter {
  padding: 5px;
}
</style>
