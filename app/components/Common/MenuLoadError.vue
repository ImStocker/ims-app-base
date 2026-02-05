<template>
  <div class="MenuLoadError">
    <div class="MenuList-item-inner-icon">
      <i class="ri-error-warning-line"></i>
    </div>
    <div
      class="MenuList-item-inner-label"
      :class="{
        'white-space-left': attachPosition === 'left',
      }"
    >
      {{ title }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { DropdownElementPlacement } from '../../logic/types/DropdownElement';

export default defineComponent({
  name: 'MenuLoadError',
  props: {
    attachPosition: {
      type: String as PropType<DropdownElementPlacement>,
      default: 'right',
    },
    title: {
      type: String,
      default: 'Error',
    },
  },
});
</script>
<style scoped lang="scss">
.MenuLoadError {
  color: var(--color-danger);
  --button-bg-color: transparent;
  cursor: default;
  &:hover {
    --button-bg-color: var(--dropdown-hl-bg-color);
  }
}
.MenuList-item-inner-label {
  text-align: left;
  text-wrap: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.white-space-left {
    padding-left: calc(var(--button-font-size) + var(--button-icon-gap));
  }

  &.white-space-right {
    padding-right: calc(var(--button-font-size) + var(--button-icon-gap));
  }
}
</style>
