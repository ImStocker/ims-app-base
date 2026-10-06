<template>
  <AiCollapsible class="AiToolCall" icon="ri-terminal-box-line">
    <template #title>
      <span class="AiToolCall-name">{{ action.toolName }}</span>
    </template>
    <template #header-actions>
      <span
        v-if="action.result"
        class="AiToolCall-badge"
        :class="action.result.success ? 'success' : 'error'"
      >
        {{ action.result.success ? '\u2713' : '\u2717' }}
      </span>
      <span v-else class="AiToolCall-badge pending">...</span>
    </template>
    <template #body>
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
    </template>
  </AiCollapsible>
</template>

<script setup lang="ts">
import { useI18n } from '#imports';
import AiCollapsible from './AiCollapsible.vue';
import type { AiToolCallAction } from '#logic/ai-core/AiTypes';

const { t } = useI18n();

defineProps<{
  action: AiToolCallAction;
}>();

function formatJSON(val: any): string {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}
</script>

<style lang="scss" scoped>
.AiToolCall-name {
  font-weight: 600;
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
