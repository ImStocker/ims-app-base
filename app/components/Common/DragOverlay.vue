<template>
  <div v-if="visible" class="DragOverlay" :class="variantClass">
    <span class="DragOverlay-text">{{ text }}</span>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: 'DragOverlay',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    text: {
      type: String,
      default: () => useI18n().t('dragOverlay.drop'),
    },
    error: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    variantClass(): string {
      return this.error ? 'DragOverlay--error' : '';
    },
  },
});
</script>
<style lang="scss" scoped>
.DragOverlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(238, 216, 17, 0.06);
  border: 2px dashed var(--root-link-color);
  border-radius: 4px;
}

.DragOverlay--error {
  border-color: var(--color-main-error);
  background: rgba(255, 83, 83, 0.06);
}

.DragOverlay-text {
  color: var(--root-link-color);
  font-weight: 500;
  font-size: 0.95em;
  user-select: none;
}

.DragOverlay--error .DragOverlay-text {
  color: var(--color-main-error);
}
</style>
