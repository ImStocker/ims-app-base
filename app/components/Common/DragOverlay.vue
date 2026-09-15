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
  inset: -6px;
  z-index: 100;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(127, 127, 127, 0.06);
  background: color-mix(in srgb, var(--root-link-color) 6%, transparent);
  border: 2px dashed rgba(127, 127, 127, 0.45);
  border: 2px dashed color-mix(in srgb, var(--root-link-color) 45%, transparent);
  border-radius: 8px;
  backdrop-filter: blur(2px);
  animation: DragOverlay-in 120ms ease-out;
}

.DragOverlay--error {
  border-color: rgba(255, 83, 83, 0.45);
  border-color: color-mix(in srgb, var(--color-main-error) 45%, transparent);
  background: rgba(255, 83, 83, 0.06);
  background: color-mix(in srgb, var(--color-main-error) 7%, transparent);
}

.DragOverlay-text {
  color: var(--root-link-color);
  font-weight: 700;
  font-size: 1em;
  letter-spacing: 0.02em;
  user-select: none;
}

.DragOverlay--error .DragOverlay-text {
  color: var(--color-main-error);
}

@keyframes DragOverlay-in {
  from {
    opacity: 0;
    transform: scale(0.99);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
