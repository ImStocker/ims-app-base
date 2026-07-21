<template>
  <div class="AiPanel">
    <div class="AiPanel-header">
      <div class="AiPanel-header-left">
        <i class="ri-bard-line"></i>
        <span class="AiPanel-header-title">{{ title }}</span>
      </div>
      <div class="AiPanel-header-right">
        <slot name="header-actions" />
        <menu-button>
          <template #button="{ toggle }">
            <button class="is-button is-button-icon" @click="toggle">
              <i class="ri-more-line"></i>
            </button>
          </template>
          <menu-list :menu-list="menu">
            <template #item-session="{ item }">
              <li class="MenuList-item use-buttons-dropdown-item AiPanel-menu-item">
                <button class="is-button MenuList-item-inner" @click="item.action">
                  <div class="MenuList-item-inner-label">{{ item.title }}</div>
                </button>
                <div class="MenuList-item-actions use-buttons-icon-small">
                  <button
                    class="is-button AiPanel-menu-item-btn"
                    :title="t('aiAssistant.renameSession')"
                    @click.stop="renameSession(item.params?.sessionId)"
                  >
                    <i class="ri-pencil-line" />
                  </button>
                  <span
                    v-if="selectedSessionId === item.params?.sessionId"
                    class="AiPanel-menu-item-checkmark"
                  >
                    <i class="ri-check-line" />
                  </span>
                  <button
                    v-else
                    class="is-button AiPanel-menu-item-btn AiPanel-menu-item-btn--danger"
                    :title="t('aiAssistant.deleteSession')"
                    @click.stop="deleteSessionById(item.params?.sessionId)"
                  >
                    <i class="ri-delete-bin-line" />
                  </button>
                </div>
              </li>
            </template>
          </menu-list>
        </menu-button>
        <button class="is-button is-button-icon AiPanel-close" @click="$emit('close')">
          <i class="ri-close-line"></i>
        </button>
      </div>
    </div>

    <div
      ref="messagesRef"
      class="AiPanel-messages tiny-scrollbars"
      @scroll.passive="onScroll"
    >
      <div class="AiPanel-message from-assistant">
        <div class="AiPanel-message-bubble">{{ t('aiAssistant.defaultMessage') }}</div>
      </div>

      <template v-for="turn in aiEditManager.turns" :key="turn.id">
        <div class="AiPanel-message from-user">
          <div class="AiPanel-message-bubble">{{ turn.userMessage }}</div>
        </div>

        <div class="AiPanel-message from-assistant">
          <div class="AiPanel-message-content">
            <template v-for="(action, ai) in turn.actions" :key="ai">
              <AiToolCall
                v-if="action.type === 'tool-call'"
                :action="action"
              />
              <div
                v-else-if="action.type === 'text' && action.content"
                class="AiPanel-message-bubble"
                v-html="getMarkedText(action.content)"
              />
              <template v-else-if="action.type === 'thinking'">
                <pre
                  v-if="turn.status === 'streaming' && ai === turn.actions.length - 1"
                  class="AiPanel-thinking-body AiPanel-thinking-streaming"
                >{{ action.text }}</pre>
                <div
                  v-else
                  class="AiPanel-thinking"
                  @click="toggleThinking(action)"
                >
                  <div class="AiPanel-thinking-header">
                    <i class="ri-brain-line"></i>
                    <span>{{ t('aiAssistant.thought') }}</span>
                    <i
                      class="ri-arrow-down-s-line"
                      :class="{ open: thinkingOpen.has(action) }"
                    />
                  </div>
                  <pre
                    v-if="thinkingOpen.has(action)"
                    class="AiPanel-thinking-body"
                  >{{ action.text }}</pre>
                </div>
              </template>
            </template>
            <div
              v-if="turn.status === 'streaming'"
              class="AiPanel-cursor"
            >\u258C</div>
          </div>
          <div
            v-if="turn.status === 'error' && turn.error"
            class="AiPanel-error"
          >{{ turn.error }}</div>
        </div>
      </template>
    </div>

    <div
      v-if="aiEditManager.changeIds.length > 0"
      class="AiPanel-changeIds"
    >
      <span class="AiPanel-changeIds-label">
        <i class="ri-file-list-3-line"></i>
        {{ t('aiAssistant.changes') }} ({{ aiEditManager.changeIds.length }})
      </span>
      <button class="AiPanel-revertBtn" :title="t('aiAssistant.revertAll')" @click="revertAllChanges">
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
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import MenuButton from '~ims-app-base/components/Common/MenuButton.vue';
import MenuList from '~ims-app-base/components/Common/MenuList.vue';
import AiPanelSend from './AiPanelSend.vue';
import AiToolCall from './AiToolCall.vue';
import { useAppManager, useI18n } from '#imports';
import AiEditManager from '~ims-app-base/logic/ai-core/AiEditManager';
import CreatorAssetManager from '~ims-app-base/logic/managers/CreatorAssetManager';
import type { AiModelDescriptor } from '~ims-app-base/logic/ai-core/AiModelDescriptors';
import DialogManager from '~ims-app-base/logic/managers/DialogManager';
import UiManager from '~ims-app-base/logic/managers/UiManager';
import AiModelSettingsDialog from '~ims-app-base/components/generation/AiModelSettingsDialog.vue';
import type { MenuListItem } from '~ims-app-base/logic/types/MenuList';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = withDefaults(defineProps<{
  title?: string;
}>(), {
  title: 'AI Assistant',
});

defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();
const appManager = useAppManager();
const aiEditManager = appManager.get(AiEditManager);

const messagesRef = ref<HTMLElement | null>(null);
const thinkingOpen = reactive(new WeakSet<{ type: 'thinking'; text: string }>());
const userScrolledAway = ref(false);
const scrollThreshold = 40;
const selectedSessionId = ref<string | null>(null);

function buildMenu(): MenuListItem[] {
  const sessionItems: MenuListItem[] = aiEditManager.sessions.map(s => ({
    name: 'session',
    title: s.title,
    params: { sessionId: s.id },
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
      action: async () => await onDeleteMessages(),
    },
  ];
}

const menu = ref<MenuListItem[]>([]);

onMounted(async () => {
  await aiEditManager.loadSessions();
  if (aiEditManager.sessions.length === 0) {
    const session = await aiEditManager.createSession(t('aiAssistant.defaultSessionName'));
    selectedSessionId.value = session.id;
  }
  menu.value = buildMenu();
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
  userScrolledAway.value = el.scrollHeight - el.scrollTop - el.clientHeight > scrollThreshold;
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
    setProviderName: provider ? provider.name : undefined
  });
}

async function newSession() {
  await aiEditManager.createSession(t('aiAssistant.defaultSessionName'));
  selectedSessionId.value = aiEditManager.currentSessionId;
  appManager.get(UiManager).showSuccess(t('aiAssistant.newSessionCreated'));
  menu.value = buildMenu();
  await nextTick();
  userScrolledAway.value = false;
  scrollToBottom();
}

async function deleteSessionById(id: string) {
  if (aiEditManager.sessions.length <= 1) return;
  await aiEditManager.deleteSession(id);
  if (selectedSessionId.value === id) {
    selectedSessionId.value = '';
  }
  if (aiEditManager.sessions.length > 0 && !selectedSessionId.value) {
    const first = aiEditManager.sessions[0];
    if (first) {
      selectedSessionId.value = first.id;
      await aiEditManager.selectSession(first.id);
    }
  }
  appManager.get(UiManager).showSuccess(t('aiAssistant.sessionDeleted'));
  menu.value = buildMenu();
}

async function renameSession(id: string) {
  const session = aiEditManager.sessions.find(s => s.id === id);
  if (!session) return;
  const newTitle = window.prompt(t('aiAssistant.renameSessionPrompt'), session.title);
  if (newTitle && newTitle.trim() && newTitle !== session.title) {
    await aiEditManager.renameSession(id, newTitle.trim());
    menu.value = buildMenu();
  }
}

async function onDeleteMessages() {
  await aiEditManager.deleteMessagesOfCurrentSessionId();
}

watch(() => aiEditManager.turnVersion, async () => {
  await nextTick();
  if (!userScrolledAway.value) {
    scrollToBottom();
  }
});

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
  await aiEditManager.sendMessage(text);
  await nextTick();
  userScrolledAway.value = false;
  scrollToBottom();
}

function stopGeneration() {
  aiEditManager.stop();
}
</script>

<style lang="scss" scoped>
@use '$style/scrollbars-mixins.scss';

.AiPanel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: var(--panel-padding);
}

.AiPanel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.AiPanel-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.AiPanel-header-title {
  font-weight: 600;
  font-size: 14px;
}

.AiPanel-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.AiPanel-close {
  font-size: 16px;
}

.AiPanel-menu-item {
  display: flex;
  justify-content: space-between;
}

.AiPanel-menu-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
}

.AiPanel-menu-item-btn--danger {
  color: var(--color-danger, #e53935) !important;
}

.AiPanel-menu-item-checkmark {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  padding: 2px 4px;
  color: var(--color-accent);
}

.AiPanel-messages {
  flex: 1 1 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  word-break: break-word;
}

.AiPanel,
.AiPanel-messages {
  min-width: 0;
}

.AiPanel-message {
  display: flex;

  &.from-user {
    justify-content: flex-end;

    .AiPanel-message-bubble {
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

.AiPanel-message-content {
  max-width: 90%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.AiPanel-message-bubble {
  max-width: 100%;
}

.AiPanel-cursor {
  animation: blink 1s step-end infinite;
  color: var(--color-accent, #4fc3f7);
  font-size: 16px;
  line-height: 1;
}

.AiPanel-error {
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

.AiPanel-changeIds {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  font-size: 11px;
  color: var(--color-placeholder, #888);
  border-top: 1px solid var(--local-border-color);
}

.AiPanel-changeIds-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 4px;
}

.AiPanel-revertBtn {
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

.AiPanel-revertBtn:hover {
  background: var(--local-box-color);
  color: var(--local-text-color);
}

.AiPanel-thinking {
  border: 1px solid var(--local-border-color, #444);
  border-radius: 8px;
  overflow: hidden;
  margin: 4px 0;
  font-size: 12px;
}

.AiPanel-thinking-header {
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

.AiPanel-thinking-body {
  margin: 0;
  padding: 8px 10px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-placeholder, #888);
  border-top: 1px solid var(--local-border-color, #333);
  max-height: 300px;
  overflow-y: auto;
}

.AiPanel-thinking-streaming {
  border-top: none;
  max-height: none;
  overflow: visible;
  padding: 0;
}
</style>
