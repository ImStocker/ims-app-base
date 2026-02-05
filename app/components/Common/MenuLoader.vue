<template>
  <div class="MenuLoader">
    <div class="loaderSpinner" />
    <div class="MenuList-item-inner-label">
      {{ $t('common.loading') }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { DropdownElementPlacement } from '../../logic/types/DropdownElement';

export default defineComponent({
  name: 'MenuLoader',
  props: {
    attachPosition: {
      type: String as PropType<DropdownElementPlacement>,
      default: 'right',
    },
  },
});
</script>
<style lang="scss" scoped>
.MenuLoader {
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
}
</style>
