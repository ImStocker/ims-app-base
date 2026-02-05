<template>
  <div class="AssetEditorToolbar">
    <!--
        <div class="AssetEditorToolbar-section">
            <button class="AssetEditorToolbar-button">
                <i class="ri-arrow-go-back-line AssetEditorToolbar-button-icon"></i>
            </button>
            <button class="AssetEditorToolbar-button">
                <i class="ri-arrow-go-forward-line AssetEditorToolbar-button-icon"></i>
            </button>
        </div>
        -->
    <div class="AssetEditorToolbar-section">
      <button
        class="is-button is-button-toolbar"
        :title="$t('assetEditor.toolbarUndo')"
        :disabled="!canUndo || !!isUndoRedoBusy"
        :class="{
          loading: isUndoRedoBusy === 'undo',
        }"
        @click="undo"
      >
        <i class="ri-arrow-go-back-line AssetEditorToolbar-button-icon"></i>
      </button>
      <button
        class="is-button is-button-toolbar"
        :title="$t('assetEditor.toolbarRedo')"
        :disabled="!canRedo || !!isUndoRedoBusy"
        :class="{
          loading: isUndoRedoBusy === 'redo',
        }"
        @click="redo"
      >
        <i class="ri-arrow-go-forward-line AssetEditorToolbar-button-icon"></i>
      </button>
    </div>
    <div
      v-if="blockButtonsMain.length > 0 || blockButtonsMenu.length > 0"
      class="AssetEditorToolbar-section"
    >
      <button
        v-for="button of blockButtonsMain"
        :key="button.name"
        class="is-button is-button-toolbar"
        :title="button.title"
        :disabled="button.disabled"
        @click="button.action"
      >
        <i class="AssetEditorToolbar-button-icon" :class="button.icon"></i>
      </button>
      <menu-button v-if="blockButtonsMenu.length > 0">
        <template #button="{ toggle }">
          <button
            class="is-button AssetEditorToolbar-button-more"
            :disabled="blockButtonsMenu.every((m) => m.disabled)"
            @click="toggle"
          >
            <i class="ri-arrow-drop-down-fill"></i>
          </button>
        </template>
        <menu-list
          class="AssetEditorToolbar-menu"
          :menu-list="blockButtonsMenu"
        ></menu-list>
      </menu-button>
    </div>
    <div
      v-if="!hideActions.includes('save')"
      class="AssetEditorToolbar-section"
    >
      <button
        class="is-button is-button-toolbar"
        :disabled="isSaveDisabled"
        :title="
          isSaving
            ? $t('assetEditor.toolbarSaving')
            : isSaveDisabled
              ? ''
              : $t('assetEditor.toolbarSaveChanges')
        "
        :class="{
          loading: isSaving,
        }"
        @click="saveChanges"
      >
        <i class="ri-save-fill AssetEditorToolbar-button-icon"></i>
      </button>
    </div>
    <div class="AssetEditorToolbar-section">
      <button
        class="is-button is-button-toolbar"
        @click="$emit('update:pinned', !pinned)"
      >
        <i :class="pinned ? 'ri-unpin-fill' : 'ri-pushpin-2-fill'"></i>
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import UiManager from '../../../logic/managers/UiManager';
import LocalFsSyncManager from '../../../logic/managers/LocalFsSyncManager';
import MenuButton from '../../Common/MenuButton.vue';
import MenuList from '../../Common/MenuList.vue';
import type { ExtendedMenuListItem } from '../../../logic/types/MenuList';
import type { IAssetEditorToolbarVM } from '../../../logic/vm/IAssetEditorToolbarVM';

export default defineComponent({
  name: 'AssetEditorToolbar',
  components: {
    MenuButton,
    MenuList,
  },
  props: {
    toolbarVm: {
      type: Object as PropType<IAssetEditorToolbarVM>,
      required: true,
    },
    hideActions: {
      type: Array<string>,
      default: () => [],
    },
    pinned: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:pinned'],
  computed: {
    isSaveDisabled() {
      return this.toolbarVm.isSaving() || !this.toolbarVm.getHasChanges();
    },
    canUndo() {
      return this.toolbarVm.canUndo();
    },
    canRedo() {
      return this.toolbarVm.canRedo();
    },
    isSaving() {
      const saving = this.toolbarVm.isSaving();
      if (saving) return true;
      return this.$getAppManager().get(LocalFsSyncManager).syncStatus.isSyncing;
    },
    isUndoRedoBusy() {
      return this.toolbarVm.isUndoRedoBusy();
    },
    blockButtonsMain(): ExtendedMenuListItem[] {
      return this.toolbarVm
        .getToolbarActions()
        .filter((a) => a.isMain && !this.hideActions.includes(a.name ?? ''));
    },
    blockButtonsMenu(): ExtendedMenuListItem[] {
      return this.toolbarVm
        .getToolbarActions()
        .filter((a) => !a.isMain && !this.hideActions.includes(a.name ?? ''));
    },
  },
  methods: {
    saveChanges() {
      return this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          return this.toolbarVm.saveChanges();
        });
    },
    undo() {
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.toolbarVm.undo();
        });
    },
    redo() {
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.toolbarVm.redo();
        });
    },
  },
});
</script>
<style lang="scss" scoped>
@use '~ims-app-base/components/ImcText/Toolbar/ImcEditorToolbar.scss';

.AssetEditorToolbar {
  display: flex;
  @include ImcEditorToolbar.ImcEditorToolbar-toolbar;

  &:deep(.is-button-toolbar) {
    @include ImcEditorToolbar.ImcEditorToolbar-button;
  }
}

.AssetEditorToolbar-section {
  @include ImcEditorToolbar.ImcEditorToolbar-section;
}

.AssetEditorToolbar-button-more {
  @include ImcEditorToolbar.ImcEditorToolbar-button-more;
}

.AssetEditorToolbar-menu {
  @include ImcEditorToolbar.ImcEditorToolbar-dropdown;
}
</style>
