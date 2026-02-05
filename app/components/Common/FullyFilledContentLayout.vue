<template>
  <div class="FullyFilledContentLayout large-scrollbars">
    <div class="FullyFilledContentLayout-content-wrapper">
      <div class="FullyFilledContentLayout-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FullyFilledContentLayout',
});
</script>
<style lang="scss" scoped>
.FullyFilledContentLayout {
  flex: 1;
  display: flex;
  min-width: 0px;
  overflow-y: scroll;
}
.FullyFilledContentLayout-content-wrapper {
  width: 100%;
  height: 100%;

  .FullyFilledContentLayout-content {
    height: 100%;
  }
}
</style>
