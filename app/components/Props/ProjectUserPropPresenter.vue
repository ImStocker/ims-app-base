<template>
  <string-prop-presenter
    class="ProjectUserPropPresenter"
    :model-value="displayingValue"
  ></string-prop-presenter>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type {
  AssetPropValue,
  AssetPropValueAccount,
} from '../../logic/types/Props';
import StringPropPresenter from './StringPropPresenter.vue';

export default defineComponent({
  name: 'ProjectUserPropPresenter',
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
      if (
        this.modelValue &&
        (this.modelValue as AssetPropValueAccount).AccountId &&
        (this.modelValue as AssetPropValueAccount).Name
      ) {
        return (this.modelValue as AssetPropValueAccount).Name;
      } else return this.modelValue;
    },
  },
});
</script>

<style lang="scss" scoped></style>
