<template>
  <button
    class="ImcEditorToolbarButton is-button is-button-toolbar"
    :class="{
      'state-active': isActive,
    }"
    :title="title"
  >
    <slot>
      <i :class="{ [icon]: true }"></i>
      <span v-if="expanded" class="ImcEditorToolbarButton-title">
        {{ title }}
      </span>
    </slot>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ImcEditorToolbarButton',
  props: {
    isActive: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    title: { type: String, default: '' },
    expanded: { type: Boolean, default: false },
  },
});
</script>

<style lang="scss" scoped>
.ImcEditorToolbarButton-title {
  margin-left: 7px;
}
</style>
