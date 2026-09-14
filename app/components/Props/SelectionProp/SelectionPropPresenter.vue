<template>
  <div class="SelectionPropPresenter">
    <template v-if="valueAsText">{{ valueAsText }}</template
    ><template v-else>&nbsp;</template>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type {
  AssetPropValue,
  AssetPropValueSelection,
} from '../../logic/types/Props';

export default defineComponent({
  name: 'SelectionPropPresenter',
  components: {},
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  computed: {
    valueAsText() {
      const val = this.modelValue as AssetPropValueSelection | null;
      return val && val.Str ? val.Str : '';
    },
  },
});
</script>

<style lang="scss" scoped>
.SelectionPropPresenter {
  padding: 5px;
}
</style>
