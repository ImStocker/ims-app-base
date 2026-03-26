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
    <div v-if="historyIsOpened" class="AssetEditorToolbar-section">
      <button
        class="is-button is-button-toolbar"
        :title="$t('gddPage.restoreThisVersion')"
        @click="restoreThisVersion()"
      >
        <i class="ri-save-fill AssetEditorToolbar-button-icon"></i>
        {{ $t('gddPage.restoreThisVersion') }}
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
    <template v-else>
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
          <i
            class="ri-arrow-go-forward-line AssetEditorToolbar-button-icon"
          ></i>
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
    </template>
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
import { defineComponent, inject, type PropType } from 'vue';
import UiManager from '../../../logic/managers/UiManager';
import MenuButton from '../../Common/MenuButton.vue';
import MenuList from '../../Common/MenuList.vue';
import type { ExtendedMenuListItem } from '../../../logic/types/MenuList';
import type { IAssetEditorToolbarVM } from '../../../logic/vm/IAssetEditorToolbarVM';
import LocalFsSyncSubContext from '#logic/project-sub-contexts/LocalFsSyncSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

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
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
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
      return this.projectContext.get(LocalFsSyncSubContext).syncStatus
        .isSyncing;
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
    historyIsOpened() {
      return !!this.blockButtonsMenu.find((item) => item.name === 'history');
    },
  },
  methods: {
    async restoreThisVersion() {
      await this.toolbarVm.saveChanges();
    },
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
