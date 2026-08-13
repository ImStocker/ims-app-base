<template>
  <div class="AiToolCall" :class="{ 'is-done': action.result }">
    <div class="AiToolCall-header" @click="expanded = !expanded">
      <i class="ri-terminal-box-line"></i>
      <span class="AiToolCall-name">{{ action.toolName }}</span>
      <span
        v-if="action.result"
        class="AiToolCall-badge"
        :class="action.result.success ? 'success' : 'error'"
      >
        {{ action.result.success ? '\u2713' : '\u2717' }}
      </span>
      <span v-else class="AiToolCall-badge pending">...</span>
      <i
        class="ri-arrow-down-s-line AiToolCall-chevron"
        :class="{ open: expanded }"
      ></i>
    </div>
    <div v-if="expanded" class="AiToolCall-body">
      <div class="AiToolCall-section">
        <div class="AiToolCall-sectionTitle">
          {{ t('aiAssistant.arguments') }}
        </div>
        <pre class="AiToolCall-json">{{ formatJSON(action.args) }}</pre>
      </div>
      <div v-if="action.result" class="AiToolCall-section">
        <div class="AiToolCall-sectionTitle">{{ t('aiAssistant.result') }}</div>
        <pre v-if="action.result.success" class="AiToolCall-json">{{
          formatJSON(action.result.result)
        }}</pre>
        <pre v-else class="AiToolCall-json error">{{
          action.result.error
        }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '#imports';
import type { AiToolCallAction } from '#logic/ai-core/AiTypes';

const { t } = useI18n();

defineProps<{
  action: AiToolCallAction;
}>();

const expanded = ref(false);

function formatJSON(val: any): string {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}
</script>

<style lang="scss" scoped>
.AiToolCall {
  border: 1px solid var(--local-border-color, #444);
  border-radius: 8px;
  overflow: hidden;
  margin: 4px 0;
  font-size: 12px;
}

.AiToolCall-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--local-box-color, rgba(255, 255, 255, 0.05));
  cursor: pointer;
  user-select: none;
}

.AiToolCall-name {
  font-weight: 600;
  flex: 1;
}

.AiToolCall-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  &.success {
    color: #a5d6a7;
  }
  &.error {
    color: #ef9a9a;
  }
  &.pending {
    color: #aaa;
  }
}

.AiToolCall-chevron {
  margin-left: auto;
  transition: transform 0.15s;
  &.open {
    transform: rotate(180deg);
  }
}

.AiToolCall-body {
  border-top: 1px solid var(--local-border-color, #444);
}

.AiToolCall-section {
  padding: 6px 10px;
  &:not(:last-child) {
    border-bottom: 1px solid var(--local-border-color, #333);
  }
}

.AiToolCall-sectionTitle {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-placeholder, #888);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.AiToolCall-json {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
  &.error {
    color: #ef9a9a;
  }
}
</style>
