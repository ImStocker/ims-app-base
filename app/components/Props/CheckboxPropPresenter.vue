<template>
  <div class="CheckboxPropPresenter">
    {{ valueAsText }}
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';

export default defineComponent({
  name: 'CheckboxPropPresenter',
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
      if (this.modelValue === null || this.modelValue === undefined) return '';
      else if (this.modelValue === false || this.modelValue === 0)
        return this.$t('common.no');
      else return this.$t('common.yes');
    },
  },
  mounted() {},
  methods: {},
});
</script>

<style lang="scss" scoped>
.CheckboxPropPresenter {
  padding: 5px;
}
</style>
