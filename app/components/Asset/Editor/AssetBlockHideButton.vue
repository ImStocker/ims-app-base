<template>
  <div class="AssetBlockHideButton">
    <button
      class="is-button is-button-icon AssetBlockHideButton-button"
      @click="isCollapsedComp = !isCollapsedComp"
    >
      <i v-if="!isCollapsedComp" class="ri-arrow-up-s-line"></i>
      <i v-else class="ri-arrow-right-s-line"></i>
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'AssetBlockHideButton',
  props: {
    isCollapsed: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:isCollapsed'],
  computed: {
    isCollapsedComp: {
      get(): boolean {
        return this.isCollapsed;
      },
      set(val: boolean) {
        this.$emit('update:isCollapsed', val);
      },
    },
  },
});
</script>
<style lang="scss">
@use '$style/devices-mixins.scss';
.AssetBlockHideButton {
  --button-font-size: 20px;
}
.AssetBlockHideButton-button {
  width: 18px;
  text-align: center;
  padding-left: 0;
  padding-right: 0;
}
</style>
