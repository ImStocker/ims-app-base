<template>
  <div class="AiChat">
    <div
      ref="messagesRef"
      class="AiChat-messages tiny-scrollbars"
      @scroll.passive="onScroll"
    >
      <div class="AiChat-message from-assistant">
        <div class="AiChat-message-bubble">
          {{ t('aiAssistant.defaultMessage') }}
        </div>
      </div>

      <template v-for="turn in aiEditManager.turns" :key="turn.id">
        <div class="AiChat-message from-user">
          <div class="AiChat-message-bubble">{{ turn.userMessage }}</div>
        </div>

        <div class="AiChat-message from-assistant">
          <div class="AiChat-message-content">
            <template v-for="(action, ai) in turn.actions" :key="ai">
              <AiToolCall v-if="action.type === 'tool-call'" :action="action" />
              <div
                v-else-if="action.type === 'text' && action.content"
                class="AiChat-message-bubble"
                v-html="getMarkedText(action.content)"
              />
              <template v-else-if="action.type === 'thinking'">
                <pre
                  v-if="
                    turn.status === 'streaming' &&
                    ai === turn.actions.length - 1
                  "
                  class="AiChat-thinking-body AiChat-thinking-streaming"
                  >{{ action.text }}</pre
                >
                <div
                  v-else
                  class="AiChat-thinking"
                  @click="toggleThinking(action)"
                >
                  <div class="AiChat-thinking-header">
                    <i class="ri-brain-line"></i>
                    <span>{{ t('aiAssistant.thought') }}</span>
                    <i
                      class="ri-arrow-down-s-line"
                      :class="{ open: thinkingOpen.has(action) }"
                    />
                  </div>
                  <pre
                    v-if="thinkingOpen.has(action)"
                    class="AiChat-thinking-body"
                    >{{ action.text }}</pre
                  >
                </div>
              </template>
            </template>
            <div v-if="turn.status === 'streaming'" class="AiChat-cursor">
              ▌
            </div>
          </div>
          <div
            v-if="turn.status === 'error' && turn.error"
            class="AiChat-error"
          >
            {{ turn.error }}
          </div>
        </div>
      </template>
    </div>

    <div v-if="aiEditManager.changeIds.length > 0" class="AiChat-changeIds">
      <span class="AiChat-changeIds-label">
        <i class="ri-file-list-3-line"></i>
        {{ t('aiAssistant.changes') }} ({{ aiEditManager.changeIds.length }})
      </span>
      <button
        class="AiChat-revertBtn"
        :title="t('aiAssistant.revertAll')"
        @click="revertAllChanges"
      >
        <i class="ri-arrow-go-back-line"></i>
      </button>
    </div>

    <ai-panel-send
      :is-generating="aiEditManager.isGenerating"
      @send="sendMessage"
      @stop="stopGeneration"
    >
      <template #actions-left>
        <slot name="send-actions-left" />
      </template>
    </ai-panel-send>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  onMounted,
  nextTick,
  watch,
  type PropType,
} from 'vue';
import AiPanelSend from './AiPanelSend.vue';
import AiToolCall from './AiToolCall.vue';
import { useAppManager, useI18n } from '#imports';
import AiEditManager from '#logic/ai-core/AiEditManager';
import ProjectManager from '#logic/managers/ProjectManager';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';
import type { AiModelDescriptor } from '#logic/ai-core/AiModelDescriptors';
import DialogManager from '#logic/managers/DialogManager';
import UiManager from '#logic/managers/UiManager';
import AiModelSettingsDialog from './AiModelSettingsDialog.vue';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import PromptDialog from '../Common/PromptDialog.vue';
import type { MenuListItem } from '#logic/types/MenuList';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps({
  ensureCanSend: {
    type: Function as PropType<() => Promise<boolean>>,
    default: null,
  },
});

const { t } = useI18n();
const appManager = useAppManager();
const aiEditManager = appManager.get(AiEditManager);

const messagesRef = ref<HTMLElement | null>(null);
const thinkingOpen = reactive(
  new WeakSet<{ type: 'thinking'; text: string }>(),
);
const userScrolledAway = ref(false);
const scrollThreshold = 40;
const selectedSessionId = ref<string | null>(null);

function buildMenu(): MenuListItem[] {
  const sessionItems: MenuListItem[] = aiEditManager.sessions.map((s) => ({
    name: 'session',
    title: s.title,
    params: {
      sessionId: s.id,
      isSelected: selectedSessionId.value === s.id,
      canDelete: aiEditManager.sessions.length > 1,
      onRename: () => renameSession(s.id),
      onDelete: () => deleteSessionById(s.id),
    },
    action: async () => {
      selectedSessionId.value = s.id;
      await aiEditManager.selectSession(s.id);
      await nextTick();
      userScrolledAway.value = false;
      scrollToBottom();
    },
  }));

  return [
    {
      title: t('aiAssistant.settings'),
      icon: 'ri-settings-3-line',
      action: async () => await setupAiModel(),
    },
    {
      title: t('aiAssistant.sessions'),
      icon: 'ri-chat-ai-fill',
      children: [
        ...sessionItems,
        { type: 'separator' },
        {
          title: t('aiAssistant.newSession'),
          icon: 'ri-add-line',
          action: async () => await newSession(),
        },
      ],
    },
    {
      type: 'separator',
    },
    {
      title: t('aiAssistant.deleteMessages'),
      icon: 'ri-delete-bin-line',
      danger: true,
      action: async () => {
        const confirm = await appManager
          .get(DialogManager)
          .show(ConfirmDialog, {
            header: t('aiAssistant.deleteMessages'),
            message: t('aiAssistant.deleteMessagesConfirm'),
            danger: true,
          });
        if (!confirm) return;
        await aiEditManager.deleteMessagesOfCurrentSessionId();
      },
    },
  ];
}

const menu = computed<MenuListItem[]>(() => buildMenu());

onMounted(async () => {
  if (!appManager.get(ProjectManager).getProjectInfo()) return;
  await aiEditManager.loadSessions();
  if (aiEditManager.sessions.length === 0) {
    const session = await aiEditManager.createSession();
    selectedSessionId.value = session.id;
  }
  if (aiEditManager.sessions.length > 0) {
    const first = aiEditManager.sessions[0];
    if (first) {
      selectedSessionId.value = first.id;
      await aiEditManager.selectSession(first.id);
    }
  }
});

function onScroll() {
  const el = messagesRef.value;
  if (!el) return;
  userScrolledAway.value =
    el.scrollHeight - el.scrollTop - el.clientHeight > scrollThreshold;
}

function toggleThinking(action: { type: 'thinking'; text: string }) {
  if (thinkingOpen.has(action)) {
    thinkingOpen.delete(action);
  } else {
    thinkingOpen.add(action);
  }
}

async function setupAiModel(provider?: AiModelDescriptor) {
  await appManager.get(DialogManager).show(AiModelSettingsDialog, {
    setProviderName: provider ? provider.name : undefined,
  });
}

async function newSession() {
  await aiEditManager.createSession();
  selectedSessionId.value = aiEditManager.currentSessionId;
  appManager.get(UiManager).showSuccess(t('aiAssistant.newSessionCreated'));
  await nextTick();
  userScrolledAway.value = false;
  scrollToBottom();
}

async function deleteSessionById(id: string) {
  if (aiEditManager.sessions.length <= 1) return;
  const confirm = await appManager.get(DialogManager).show(ConfirmDialog, {
    header: t('aiAssistant.deleteSession'),
    message: t('aiAssistant.deleteSessionConfirm'),
    danger: true,
  });
  if (!confirm) return;
  const index = aiEditManager.sessions.findIndex((s) => s.id === id);
  await aiEditManager.deleteSession(id);
  if (selectedSessionId.value === id) {
    selectedSessionId.value = '';
    const next =
      aiEditManager.sessions[
        Math.min(index, aiEditManager.sessions.length - 1)
      ];
    if (next) {
      selectedSessionId.value = next.id;
      await aiEditManager.selectSession(next.id);
    }
  }
  appManager.get(UiManager).showSuccess(t('aiAssistant.sessionDeleted'));
}

async function renameSession(id: string) {
  const session = aiEditManager.sessions.find((s) => s.id === id);
  if (!session) return;
  const newTitle = await appManager.get(DialogManager).show(PromptDialog, {
    header: t('aiAssistant.renameSession'),
    value: session.title,
  });
  if (newTitle && newTitle.trim() && newTitle !== session.title) {
    await aiEditManager.renameSession(id, newTitle.trim());
  }
}

watch(
  () => aiEditManager.turnVersion,
  async () => {
    await nextTick();
    if (!userScrolledAway.value) {
      scrollToBottom();
    }
  },
);

function getMarkedText(text: string) {
  const toolCallStart = text.indexOf('<tool_call>');
  if (toolCallStart >= 0) {
    text = text.substring(0, toolCallStart);
  }
  return DOMPurify.sanitize(marked.parse(text).toString());
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
}

async function revertAllChanges() {
  const ids = [...aiEditManager.changeIds];
  const creatorAssetManager = appManager.get(CreatorAssetManager);
  for (const cid of ids) {
    await creatorAssetManager.changeAssetsUndo({ changeId: cid });
  }
  aiEditManager.changeIds = [];
}

async function sendMessage(input: string) {
  const text = input.trim();
  if (!text) return;
  if (props.ensureCanSend && !(await props.ensureCanSend())) return;
  await aiEditManager.sendMessage(text);
  await nextTick();
  userScrolledAway.value = false;
  scrollToBottom();
}

function stopGeneration() {
  aiEditManager.stop();
}

defineExpose({
  menu,
});
</script>

<style lang="scss" scoped>
@use '$style/scrollbars-mixins.scss';

.AiChat {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: var(--panel-padding);
}

.AiChat-messages {
  flex: 1 1 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  word-break: break-word;
}

.AiChat,
.AiChat-messages {
  min-width: 0;
}

.AiChat-message {
  display: flex;

  &.from-user {
    justify-content: flex-end;

    .AiChat-message-bubble {
      background-color: var(--local-box-color);
      padding: 0px 12px;
      border-radius: 12px;
      margin-bottom: 2px;
    }
  }

  &.from-assistant {
    justify-content: flex-start;
  }

  &:deep(pre) {
    overflow-x: auto;
    max-width: 100%;
    @include scrollbars-mixins.tiny-scrollbars;
  }
}

.AiChat-message-content {
  max-width: 90%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.AiChat-message-bubble {
  max-width: 100%;
}

.AiChat-cursor {
  animation: blink 1s step-end infinite;
  color: var(--color-accent, #4fc3f7);
  font-size: 16px;
  line-height: 1;
}

.AiChat-error {
  color: var(--color-danger);
  font-size: 0.875rem;
  padding: 8px 12px;
  background: color-mix(in oklab, var(--color-danger) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--color-danger) 30%, transparent);
  border-radius: 8px;
  margin: 4px 0;
  white-space: pre-wrap;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.AiChat-changeIds {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  font-size: 11px;
  color: var(--color-placeholder, #888);
  border-top: 1px solid var(--local-border-color);
}

.AiChat-changeIds-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 4px;
}

.AiChat-revertBtn {
  border: none;
  background: transparent;
  color: var(--color-placeholder, #888);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  margin-left: auto;
}

.AiChat-revertBtn:hover {
  background: var(--local-box-color);
  color: var(--local-text-color);
}

.AiChat-thinking {
  border: 1px solid var(--local-border-color, #444);
  border-radius: 8px;
  overflow: hidden;
  margin: 4px 0;
  font-size: 12px;
}

.AiChat-thinking-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--local-box-color, rgba(255, 255, 255, 0.05));
  cursor: pointer;
  user-select: none;
  color: var(--color-placeholder, #888);

  .ri-arrow-down-s-line {
    margin-left: auto;
    transition: transform 0.15s;

    &.open {
      transform: rotate(180deg);
    }
  }
}

.AiChat-thinking-body {
  margin: 0;
  padding: 8px 10px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
  color: var(--sub-text-color, #888);
  border-top: 1px solid var(--local-border-color, #333);
  max-height: 300px;
  overflow-y: auto;
}

.AiChat-thinking-streaming {
  border-top: none;
  max-height: none;
  overflow: visible;
  padding: 0;
}
</style>
