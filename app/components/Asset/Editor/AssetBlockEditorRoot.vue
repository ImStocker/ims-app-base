<template>
  <div class="AssetBlockEditorRoot">
    <slot :asset-block-editor="assetBlockEditor"></slot>
    <slot
      v-if="!isReadonly && isActiveEditor"
      name="toolbar"
      :asset-block-editor="assetBlockEditor"
      :hide-actions="toolbarHideActions"
    >
      <asset-editor-toolbar-widget
        class="AssetBlockEditor-toolbar"
        :toolbar-vm="assetBlockEditor"
        :hide-actions="toolbarHideActions"
      ></asset-editor-toolbar-widget>
    </slot>
    <transition name="AssetBlockEditor-panel">
      <div v-if="selectionVisible" class="AssetBlockEditor-selectionPanel">
        <span class="AssetBlockEditor-selectionCount">
          {{ $t('assetEditor.blockSelectionCount', { count: selectionCount }) }}
        </span>
        <menu-button
          v-model:shown="copyMenuShown"
          attach-position="top"
          class="AssetBlockEditor-selectionCopy"
        >
          <template #button="{ toggle }">
            <div class="AssetBlockEditor-selectionCopyInner">
              <button
                class="AssetBlockEditor-selectionAction is-accent"
                @click="assetBlockEditor.copySelectedBlocks()"
              >
                <i class="ri-file-copy-line"></i>
                {{ $t('assetEditor.copy') }}
              </button>
              <button
                class="AssetBlockEditor-selectionAction is-accent AssetBlockEditor-selectionCaret"
                :class="{ 'is-open': copyMenuShown }"
                @click="toggle"
              >
                <i class="ri-arrow-down-s-line"></i>
              </button>
            </div>
          </template>
          <menu-list
            :menu-list="copyMenuItems"
            attach-position="top"
          ></menu-list>
        </menu-button>
        <button
          class="AssetBlockEditor-selectionAction is-icon is-danger"
          :title="$t('assetEditor.blockSelectionDelete')"
          :disabled="!assetBlockEditor.canDeleteSelectedBlocks()"
          @click="deleteSelectedBlocks()"
        >
          <i class="ri-delete-bin-line"></i>
        </button>
        <button
          class="AssetBlockEditor-selectionAction is-icon"
          :title="$t('assetEditor.blockSelectionClear')"
          @click="assetBlockEditor.clearBlockSelection()"
        >
          <i class="ri-close-line"></i>
        </button>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import type { AssetFullInstanceR } from '../../../logic/types/AssetFullInstance';
import { AssetRights } from '../../../logic/types/Rights';
import AssetEditorToolbarWidget from '../Editor/AssetEditorToolbarWidget.vue';
import EditorManager from '../../../logic/managers/EditorManager';
import { useAppManager } from '../../../composables/useAppManager';
import type { AssetHistoryVM } from '#logic/vm/AssetHistoryVM';
import MenuButton from '../../Common/MenuButton.vue';
import MenuList from '../../Common/MenuList.vue';
import type { MenuListItem } from '../../../logic/types/MenuList';

export default defineComponent({
  name: 'AssetBlockEditorRoot',
  components: {
    AssetEditorToolbarWidget,
    MenuButton,
    MenuList,
  },
  props: {
    assetFull: {
      type: Object as PropType<AssetFullInstanceR>,
      required: true,
    },
    historyModeVM: {
      type: [Object, null] as PropType<AssetHistoryVM | null>,
      default: null,
    },
    toolbarShowBlockCopyPaste: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['close-history-mode'],
  async setup(props) {
    const appManager = useAppManager();
    const assetBlockEditor = AssetBlockEditorVM.CreateInstance(
      appManager,
      props.assetFull,
    );
    await assetBlockEditor.init();
    assetBlockEditor.historyModeVM = props.historyModeVM;
    return {
      assetBlockEditor,
      globalKeydownHandler: null as ((e: KeyboardEvent) => void) | null,
    };
  },
  data() {
    return {
      copyMenuShown: false,
    };
  },
  computed: {
    isReadonly() {
      return this.assetFull.rights <= AssetRights.READ_ONLY;
    },
    selectionCount() {
      return this.assetBlockEditor.selectedBlockIds.size;
    },
    selectionVisible() {
      return !this.isReadonly && this.selectionCount > 0;
    },
    isActiveEditor() {
      return (
        this.$getAppManager().get(EditorManager).activeEditor ===
        this.assetBlockEditor
      );
    },
    toolbarHideActions() {
      return this.toolbarShowBlockCopyPaste ? [] : ['blockPaste'];
    },
    copyMenuItems(): MenuListItem[] {
      return [
        {
          name: 'makeSyncedCopy',
          title: this.$t('assetEditor.makeSyncedCopy'),
          icon: 'ri-link',
          action: () => {
            this.assetBlockEditor.copySelectedBlocksAsMirrors();
          },
        },
      ];
    },
    assetBlockEditorHistoryMode() {
      return this.assetBlockEditor.historyModeVM;
    },
  },
  watch: {
    assetBlockEditorHistoryMode() {
      if (
        this.assetBlockEditorHistoryMode !== this.historyModeVM &&
        !this.assetBlockEditorHistoryMode
      ) {
        this.$emit('close-history-mode');
      }
    },
    async assetFull() {
      if (this.assetBlockEditor) this.assetBlockEditor.destroy();
      this.assetBlockEditor = AssetBlockEditorVM.CreateInstance(
        this.$getAppManager(),
        this.assetFull,
      );
      this.assetBlockEditor.historyModeVM = this.historyModeVM;
      await this.assetBlockEditor.init();
    },
    historyModeVM() {
      if (this.assetBlockEditorHistoryMode !== this.historyModeVM) {
        this.assetBlockEditor.historyModeVM = this.historyModeVM;
      }
    },
  },
  async mounted() {
    this.assetBlockEditor.initClient();
    this._resetGlobalKeydownEvent(true);
  },
  unmounted() {
    this.assetBlockEditor.destroy();
    this._resetGlobalKeydownEvent(false);
  },
  methods: {
    _resetGlobalKeydownEvent(init: boolean) {
      if (this.globalKeydownHandler) {
        window.removeEventListener('keydown', this.globalKeydownHandler);
        this.globalKeydownHandler = null;
      }
      if (init) {
        this.globalKeydownHandler = (ev) => {
          if (this.isActiveEditor) {
            if (ev.code === 'KeyS' && (ev.ctrlKey || ev.metaKey)) {
              ev.preventDefault();
              this.assetBlockEditor.saveChanges();
            } else if (
              (ev.code === 'KeyZ' || ev.code === 'KeyY') &&
              (ev.ctrlKey || ev.metaKey)
            ) {
              const isTextInput =
                ev.target instanceof HTMLElement &&
                (ev.target.tagName === 'INPUT' ||
                  ev.target.tagName === 'TEXTAREA' ||
                  ev.target.isContentEditable);

              if (isTextInput) {
                // text input history
                return;
              }
              ev.preventDefault();
              if (ev.code === 'KeyZ') this.assetBlockEditor.undo();
              else this.assetBlockEditor.redo();
            }
          }
        };
        window.addEventListener('keydown', this.globalKeydownHandler);
      }
    },
    async saveChanges() {
      await this.assetBlockEditor.saveChanges();
    },
    async deleteSelectedBlocks() {
      await this.assetBlockEditor.deleteSelectedBlocks();
    },
  },
});
</script>

<style lang="scss" scoped>
.AssetBlockEditor-selectionPanel {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 22px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: calc(100vw - 40px);
  padding: 8px 8px 8px 16px;
  border-radius: 14px;
  border: 1px solid var(--local-border-color);
  background: color-mix(in srgb, var(--dropdown-bg-color) 92%, transparent);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);

  .AssetBlockEditor-selectionCount {
    flex: none;
    padding: 0 6px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
}

.AssetBlockEditor-selectionAction {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--local-border-color);
  background: transparent;
  color: var(--local-sub-text-color);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;

  i {
    font-size: 14px;
  }

  &:hover:not(:disabled) {
    border-color: var(--color-accent);
    color: var(--local-text-color);
    background: var(--local-hl-bg-color);
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  &.is-icon {
    gap: 0;
    padding: 6px 8px;

    i {
      font-size: 15px;
    }
  }

  &.is-danger {
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);

    &:hover:not(:disabled) {
      border-color: var(--color-danger);
      color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 12%, transparent);
    }
  }

  &.is-accent {
    color: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);

    &:hover:not(:disabled) {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 14%, transparent);
    }
  }
}

.AssetBlockEditor-selectionCopyInner {
  display: flex;

  .AssetBlockEditor-selectionAction {
    border-radius: 8px;

    &:first-child {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
  }

  .AssetBlockEditor-selectionCaret {
    margin-left: -1px;
    padding: 5px 4px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;

    i {
      font-size: 15px;
      transition: transform 0.15s ease;
    }

    &.is-open i {
      transform: rotate(180deg);
    }
  }
}

.AssetBlockEditor-panel-enter-active,
.AssetBlockEditor-panel-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.AssetBlockEditor-panel-enter-from,
.AssetBlockEditor-panel-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}
</style>
