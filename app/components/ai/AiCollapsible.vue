<template>
  <div class="AiCollapsible">
    <div
      class="AiCollapsible-header"
      role="button"
      tabindex="0"
      @click="toggle"
    >
      <i v-if="icon" :class="icon"></i>
      <span class="AiCollapsible-title"><slot name="title" /></span>
      <slot name="header-actions" />
      <i
        class="ri-arrow-down-s-line AiCollapsible-chevron"
        :class="{ open }"
      ></i>
    </div>
    <div v-if="open" class="AiCollapsible-body">
      <slot name="body" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    icon?: string;
  }>(),
  { icon: '' },
);

const open = ref(false);

function toggle() {
  open.value = !open.value;
}
</script>

<style lang="scss" scoped>
.AiCollapsible {
  border: 1px solid var(--local-border-color, #444);
  border-radius: 8px;
  overflow: hidden;
  margin: 4px 0;
  font-size: 12px;
}

.AiCollapsible-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: color-mix(
    in oklab,
    var(--local-box-color, rgba(255, 255, 255, 0.05)) 60%,
    var(--local-bg-color)
  );
  color: var(--color-placeholder, #888);
  cursor: pointer;
  user-select: none;
}

.AiCollapsible-title {
  flex: 1;
  min-width: 0;
}

.AiCollapsible-chevron {
  transition: transform 0.15s;

  &.open {
    transform: rotate(180deg);
  }
}

.AiCollapsible-body {
  border-top: 1px solid var(--local-border-color, #333);
}
</style>
