<template>
  <div class="AiPanelSend">
    <textarea
      ref="textareaRef"
      v-model="messageText"
      class="AiPanelSend-textarea tiny-scrollbars"
      :placeholder="t('aiAssistant.placeholder')"
      rows="1"
      :disabled="isGenerating"
      @keydown.enter.exact="onEnter"
    />
    <div class="AiPanelSend-actions">
      <slot name="actions-left" />
      <button
        v-if="isGenerating"
        class="AiPanelSend-stopBtn is-button is-button-icon-outlined"
        @click="$emit('stop')"
      >
        <i class="ri-stop-fill" />
      </button>
      <button v-else class="AiPanelSend-sendBtn" @click="sendMessage()">
        <i class="ri-send-plane-fill" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAppManager, useI18n } from '#imports';
import AiManager from '#logic/ai-core/AiManager';

const props = defineProps({
  isGenerating: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['send', 'stop']);

const { t } = useI18n();
const appManager = useAppManager();

const messageText = ref('');

function onEnter(e: KeyboardEvent) {
  e.preventDefault();
  sendMessage();
}

async function sendMessage() {
  if (props.isGenerating) return;

  const has_ai_model = await appManager
    .get(AiManager)
    .ensureAiModelSetupDialog();

  if (!has_ai_model) return;

  const text = messageText.value.trim();
  if (!text) return;

  emit('send', text);
  messageText.value = '';
}
</script>

<style lang="scss" scoped>
.AiPanelSend {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--local-border-color);
  background-color: var(--local-box-color);
  padding: 12px 8px 8px 12px;
  gap: 8px;
  border-radius: 12px;
  max-height: 128px;
  height: 100%;
}

.AiPanelSend-textarea {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--local-text-color);
  font-family: inherit;
  max-height: 200px;
  padding: 0;

  &:disabled {
    opacity: 0.5;
  }

  &::placeholder {
    color: var(--color-placeholder);
    font-style: italic;
  }
}

.AiPanelSend-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.AiPanelSend-sendBtn {
  margin-left: auto;
  cursor: pointer;
  line-height: 1;
  font-size: 18px;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  transition:
    color 0.2s,
    background-color 0.2s;
  color: var(--local-text-on-primary-color);
  background-color: var(--color-accent);

  &:hover {
    background-color: var(--color-accent-light);
  }
}

.AiPanelSend-stopBtn {
  margin-left: auto;
  color: var(--local-text-on-primary-color);
  background-color: var(--color-danger, #c62828);

  &:hover {
    background-color: var(--color-danger-light, #e53935);
  }
}
</style>
