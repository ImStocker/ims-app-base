<template>
  <div
    class="AiChatPanel"
    :class="`resize-${resizeSide}`"
    :style="{ width: panelWidth + 'px' }"
  >
    <div
      v-if="resizeSide === 'left'"
      class="AiChatPanel-resizer"
      @mousedown="startResize"
    />
    <div class="AiChatPanel-inner">
      <div class="AiChatPanel-header">
        <div class="AiChatPanel-header-main">
          <i :class="icon" class="AiChatPanel-icon" />
          <div class="AiChatPanel-header-title">
            <slot name="title">{{ title }}</slot>
          </div>
        </div>
        <div class="AiChatPanel-header-manage">
          <slot name="header-actions" />
          <menu-button v-if="menu.length > 0">
            <template #button="{ toggle }">
              <button class="is-button is-button-icon" @click="toggle">
                <i class="ri-more-line" />
              </button>
            </template>
            <menu-list :menu-list="menu">
              <template #item-session="{ item }">
                <AiSessionMenuItem :item="item" />
              </template>
            </menu-list>
          </menu-button>
          <button
            class="is-button is-button-icon AiChatPanel-close"
            @click="$emit('close')"
          >
            <i class="ri-close-line" />
          </button>
        </div>
      </div>
      <div class="AiChatPanel-content">
        <AiChat ref="aiChatRef">
          <template #send-actions-left>
            <slot name="send-actions-left" />
          </template>
        </AiChat>
      </div>
    </div>
    <div
      v-if="resizeSide === 'right'"
      class="AiChatPanel-resizer"
      @mousedown="startResize"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type PropType } from 'vue';
import MenuButton from '../Common/MenuButton.vue';
import MenuList from '../Common/MenuList.vue';
import AiChat from './AiChat.vue';
import AiSessionMenuItem from './AiSessionMenuItem.vue';
import { useAppManager } from '#imports';
import UiPreferenceManager from '#logic/managers/UiPreferenceManager';
import type { MenuListItem } from '#logic/types/MenuList';

const props = defineProps({
  title: {
    type: String,
    default: 'AI Assistant',
  },
  icon: {
    type: String,
    default: 'ri-bard-line',
  },
  defaultWidth: {
    type: Number,
    default: 420,
  },
  minWidth: {
    type: Number,
    default: 280,
  },
  maxWidth: {
    type: Number,
    default: 800,
  },
  storageKey: {
    type: String,
    default: 'AiChatPanel.width',
  },
  resizeSide: {
    type: String as PropType<'left' | 'right'>,
    default: 'left',
  },
});

defineEmits(['close']);

const aiChatRef = ref<
  (InstanceType<typeof AiChat> & { menu?: MenuListItem[] }) | null
>(null);
const menu = computed<MenuListItem[]>(() => aiChatRef.value?.menu ?? []);

const panelWidth = ref(props.defaultWidth);

onMounted(() => {
  if (!props.storageKey) return;
  const pref = useAppManager().get(UiPreferenceManager);
  const saved = pref.getPreference<number>(
    props.storageKey,
    props.defaultWidth,
  );
  panelWidth.value = saved ?? props.defaultWidth;
});

function saveWidth(width: number) {
  if (!props.storageKey) return;
  useAppManager()
    .get(UiPreferenceManager)
    .setPreference(props.storageKey, width);
}

function startResize(e: MouseEvent) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = panelWidth.value;

  function onMouseMove(ev: MouseEvent) {
    const diff =
      props.resizeSide === 'left' ? startX - ev.clientX : ev.clientX - startX;
    panelWidth.value = Math.round(
      Math.max(props.minWidth, Math.min(props.maxWidth, startWidth + diff)),
    );
  }

  function onMouseUp() {
    saveWidth(panelWidth.value);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    document.body.classList.remove('AiChatPanel-resizing');
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseup', onMouseUp);
  document.body.classList.add('AiChatPanel-resizing');
}
</script>

<style lang="scss" scoped>
.AiChatPanel {
  flex-shrink: 0;
  display: flex;
  position: relative;
  z-index: 100;
  height: 100%;
  --local-bg-color: var(--root-box-color);
  --local-box-color: var(--root-bg-color);
  background: var(--local-bg-color);
  box-sizing: border-box;

  &.resize-left {
    border-left: 1px solid var(--local-border-color);
  }

  &.resize-right {
    border-right: 1px solid var(--local-border-color);
  }
}

.AiChatPanel-resizer {
  width: 5px;
  cursor: ew-resize;
  flex-shrink: 0;
  background: transparent;
  transition: background 0.15s;
  z-index: 1;

  &:hover,
  &:active {
    background: var(--color-accent, #4fc3f7);
  }
}

.AiChatPanel-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 0;
}

.AiChatPanel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--local-border-color);
  padding: 8px var(--panel-padding-horizontal);
  height: var(--ProjectLayout-header-height, auto);
}

.AiChatPanel-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.AiChatPanel-icon {
  color: var(--color-accent);
  font-size: 20px;
  line-height: 1;
}

.AiChatPanel-header-title {
  font-weight: 600;
  font-size: 14px;
}

.AiChatPanel-header-manage {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.AiChatPanel-close {
  font-size: 16px;
}

.AiChatPanel-content {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>

<style lang="scss" rel="stylesheet/scss">
.AiChatPanel-resizing {
  cursor: ew-resize;
  user-select: none;
}
</style>
