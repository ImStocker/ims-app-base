<template>
  <div
    class="EditorBlock"
    :class="{
      'state-error': !!savingError,
      'state-readonly': isReadOnly,
      'state-edit': editMode,
      'state-hide-content': isCollapsed,
    }"
    :block-type="resolvedBlock.type"
    :block-name="resolvedBlock.name"
  >
    <div :id="blockIdAnchorTagId" ref="top"></div>
    <div v-if="blockNameAnchorTagId" :id="blockNameAnchorTagId"></div>
    <div
      v-if="!['page', 'print'].includes(displayMode)"
      class="EditorBlock-stateEdit"
      :class="{ 'state-edit': editMode }"
    ></div>
    <div
      v-if="!['page', 'print'].includes(displayMode)"
      class="EditorBlock-leftControls"
    >
      <i
        v-if="draggable && !isReadOnly"
        class="EditorBlock-drag ri-draggable"
      ></i>
      <div v-else-if="isReadOnly" class="EditorBlock-isReadOnly-icon">
        <i class="ri-lock-fill"></i>
      </div>
      <i
        v-if="savingError"
        class="ri-error-warning-fill EditorBlock-saveErrorMarker"
        :title="$t('assetEditor.blockSaveError', { error: savingError })"
        @click="commitBlock"
      ></i>
    </div>
    <div
      v-if="displayMode !== 'page' && !hideBlockMenu"
      class="EditorBlock-rightControls"
    >
      <menu-button
        v-if="!isReadOnly"
        class="EditorBlock-menu"
        :class="{ 'state-active': isDropdownMenuShown }"
        @show="isDropdownMenuShown = true"
        @hide="isDropdownMenuShown = false"
      >
        <menu-list :menu-list="menuList"></menu-list>
      </menu-button>
      <notification-icon
        v-if="showNewChanges"
        class="EditorBlock-notificationIcon"
      ></notification-icon>
    </div>
    <div v-if="saving" class="EditorBlock-saving loaderBar"></div>
    <div
      v-if="
        !hideBlockHeader &&
        (resolvedBlock.title ||
          (resolvedBlock.name && showName) ||
          isRenaming ||
          toolbarRequested)
      "
      class="EditorBlock-header"
    >
      <div class="EditorBlock-header-title">
        <div
          v-if="!resolvedBlock.title && !isRenaming && blockFullAccess"
          class="EditorBlock-create-header-suggestion"
          @click="startRenaming()"
        ></div>
        <renamable-text
          v-else
          v-model:is-renaming-mode-state="isRenaming"
          :disabled="!blockFullAccess"
          class="EditorBlock-header-title-value"
          :value="resolvedBlock.title ?? ''"
          @change="changeTitle"
        >
          <caption-string :value="resolvedBlock.title ?? ''" />
        </renamable-text>
      </div>
      <div
        v-if="toolbarRequested"
        ref="toolbar"
        class="EditorBlock-header-toolbar"
      ></div>
      <div v-if="!hideBlockMenu" class="EditorBlock-header-menu">
        <div
          v-if="resolvedBlock.name && showName"
          class="EditorBlock-header-name"
        >
          <i class="ri-price-tag-3-fill"></i>
          <span>{{ resolvedBlock.name }}</span>
        </div>
      </div>
    </div>
    <editor-block-content
      v-if="!isCollapsed"
      ref="content"
      class="EditorBlock-content"
      :asset-block-editor="assetBlockEditor"
      :readonly="isReadOnly"
      :rights="resolvedBlock.rights"
      :asset-changer="assetBlockEditor.assetChanger"
      :display-mode="displayMode"
      :editor-block-handler="editorBlockHandler"
      :block-props="blockProps"
      :resolved-block="resolvedBlock"
      :request-toolbar-target="requestToolbarTarget ?? requestToolbarTargetSelf"
      @click="editorBlockContentClicked"
      @save="commitBlock()"
      @view-ready="$emit('view-ready', $event)"
      @send-message="$emit('sendMessage')"
    >
      <template
        v-for="injectedBlockSlot of injectedBlockSlots"
        :key="injectedBlockSlot.originalSlot"
        #[injectedBlockSlot.blockSlot]
      >
        <slot :name="injectedBlockSlot.originalSlot"></slot>
      </template>
    </editor-block-content>

    <asset-reference-list
      v-if="!hideLinks"
      class="EditorBlock-references"
      :asset-block-editor="assetBlockEditor"
      :combined-references="resolvedBlock.references"
    />
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { AssetBlockChangable } from '../../../logic/types/BlocksType';
import {
  convertTranslatedTitle,
  makeAnchorTagId,
  makeBlockIdAnchorTagId,
  makeBlockNameAnchorTagId,
  type AssetDisplayMode,
  type ResolvedAssetBlock,
} from '../../../logic/utils/assets';
import RenamableText from '../../Common/RenamableText.vue';
import UiManager, {
  type DoTaskResult,
} from '../../../logic/managers/UiManager';
import DialogManager from '../../../logic/managers/DialogManager';
import PromptDialog from '../../Common/PromptDialog.vue';
import ConfirmDialog from '../../Common/ConfirmDialog.vue';
import CaptionString from '../../Common/CaptionString.vue';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import TaskManager from '../../../logic/managers/TaskManager';
import {
  castAssetPropValueToString,
  makeBlockRef,
  stringifyAssetNewBlockRef,
} from '../../../logic/types/Props';
import type { EditorBlockHandler } from './EditorBlock';
import AssetRefsDialog from '../References/AssetRefsDialog.vue';
import {
  AssetRights,
  MIN_ASSET_RIGHTS_TO_CHANGE,
  MIN_WORKSPACE_RIGHTS_TO_COMMENT,
  MIN_WORKSPACE_RIGHTS_TO_READ,
} from '../../../logic/types/Rights';
import MenuButton from '../../Common/MenuButton.vue';
import MenuList from '../../Common/MenuList.vue';
import type { MenuListItem } from '../../../logic/types/MenuList';
import ProjectManager from '../../../logic/managers/ProjectManager';
import NotificationIcon from '../ProjectTree/NotificationIcon.vue';
import { isAssetUnreadAny } from '../../../logic/types/AssetUnread';
import EditorManager from '../../../logic/managers/EditorManager';
import EditorBlockContent from './EditorBlockContent.vue';
import { isElementInteractive } from '../../utils/DomElementUtils';
import { v4 as uuidv4 } from 'uuid';
import AssetReferenceList from '../References/AssetReferenceList.vue';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';

export default defineComponent({
  name: 'EditorBlock',
  components: {
    RenamableText,
    CaptionString,
    MenuButton,
    MenuList,
    NotificationIcon,
    EditorBlockContent,
    AssetReferenceList,
  },
  provide() {
    return {
      projectContext: this.assetBlockEditor,
    };
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    draggable: {
      type: Boolean,
      default: false,
    },
    hideBlockMenu: {
      type: Boolean,
      default: () => false,
    },
    hideBlockHeader: {
      type: Boolean,
      default: () => false,
    },
    hideLinks: {
      type: Boolean,
      default: false,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
    isRenamingState: {
      type: Boolean,
      default: false,
    },
    blockProps: {
      type: Object as PropType<any>,
      default: null,
    },
    hasComments: {
      type: Boolean,
      default: false,
    },
    showName: {
      type: Boolean,
      default: true,
    },
    allowAddComments: {
      type: Boolean,
      default: true,
    },
    allowDeleteBlock: {
      type: Boolean,
      default: true,
    },
    isCollapsed: {
      type: Boolean,
      default: false,
    },
    requestToolbarTarget: {
      type: [Function, null] as PropType<
        (() => Promise<HTMLElement | null>) | null
      >,
      default: null,
    },
  },
  emits: [
    'update:is-renaming-state',
    'view-ready',
    'sendMessage',
    'show-chat',
    'update:isCollapsed',
  ],
  data() {
    return {
      saving: false,
      savingEpoch: 0,
      savingError: null as string | null,
      childComponentInFocus: true,
      isRenaming: false,
      isDropdownMenuShown: false,
      toolbarRequested: false,
    };
  },
  computed: {
    showNewChanges() {
      return (
        this.assetBlockEditor.assetFull?.lastViewedAt &&
        this.resolvedBlock.updatedAt >
          this.assetBlockEditor.assetFull.lastViewedAt &&
        isAssetUnreadAny(this.assetBlockEditor.assetFull?.unread ?? 0)
      );
    },
    injectedBlockSlots() {
      return Object.keys(this.$slots)
        .filter((slotName) => slotName.startsWith('block-'))
        .map((slotName) => {
          return {
            originalSlot: slotName,
            blockSlot: slotName.substring('block-'.length),
          };
        });
    },
    blockName() {
      if (!this.blockTypeDefinition) return;
      return this.blockTypeDefinition.name;
    },
    blockNameAnchorTagId() {
      return this.resolvedBlock.name
        ? makeBlockNameAnchorTagId(this.resolvedBlock.name)
        : null;
    },
    blockIdAnchorTagId() {
      return makeBlockIdAnchorTagId(this.resolvedBlock.id);
    },
    canCreateTask() {
      return this.$getAppManager().get(ProjectManager).canCreateTask();
    },
    menuList(): MenuListItem[] {
      const gdd_folder = this.$getAppManager()
        .get(ProjectManager)
        .getWorkspaceByName('gdd');

      return [
        ...(this.isInherited
          ? [
              {
                title: this.$t('assetEditor.inheritedBlock'),
                name: 'inherited',
                icon: 'inherited',
              },
            ]
          : []),
        {
          title: this.$t('assetEditor.blockMenu.rename'),
          name: 'rename',
          action: this.renameBlock,
        },
        ...(!this.isInherited
          ? [
              {
                title: this.$t('assetEditor.blockMenu.setServiceName'),
                action: this.setServiceName,
                icon: 'serviceName',
              },
            ]
          : []),
        ...(this.canCreateTask && !this.hideLinks
          ? [
              {
                title: this.$t('boardPage.tasks.createSubtask'),
                action: this.createTask,
                icon: 'task',
              },
            ]
          : []),
        ...(gdd_folder &&
        gdd_folder.rights >= MIN_WORKSPACE_RIGHTS_TO_READ &&
        !this.isDesktop &&
        !this.hideLinks
          ? [
              {
                title: this.$t('gddPage.createRef'),
                action: this.createRef,
                icon: 'link',
              },
            ]
          : []),
        ...(gdd_folder &&
        gdd_folder.rights >= MIN_WORKSPACE_RIGHTS_TO_READ &&
        !this.isDesktop &&
        (this.hasComments ||
          (gdd_folder.rights >= MIN_WORKSPACE_RIGHTS_TO_COMMENT &&
            this.allowAddComments))
          ? [
              {
                title: this.$t(
                  !this.hasComments &&
                    gdd_folder.rights >= MIN_WORKSPACE_RIGHTS_TO_COMMENT
                    ? 'addComment'
                    : 'showComment',
                ),
                action: () => this.$emit('show-chat'),
                icon: this.hasComments ? 'ri-chat-4-fill' : 'ri-chat-new-fill',
              },
            ]
          : []),
        {
          title: this.$t('assetEditor.blockMenu.edit'),
          action: this.editBlock,
          icon: 'edit',
        },
        ...(this.isInherited && this.resolvedBlock.own === true
          ? [
              {
                title: this.$t('assetEditor.blockMenu.restoreInitialValues'),
                action: this.restoreInitialValues,
                icon: 'ri-reset-left-line',
              },
            ]
          : []),
        ...(this.resolvedBlock.rights > AssetRights.FILL_EMPTY &&
        this.allowDeleteBlock
          ? [
              {
                title: this.$t('assetEditor.blockMenu.delete'),
                action: this.deleteBlock,
                icon: 'delete',
                name: 'delete',
                danger: true,
              },
            ]
          : []),
      ];
    },
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    editMode() {
      return this.assetBlockEditor.isBlockEditing(this.resolvedBlock.id);
    },
    isReadOnly() {
      return (
        this.resolvedBlock.rights < MIN_ASSET_RIGHTS_TO_CHANGE || this.readonly
      );
    },
    blockFullAccess() {
      return this.resolvedBlock.rights === AssetRights.FULL_ACCESS;
    },
    editorBlockHandler(): EditorBlockHandler {
      return {
        save: () => this.commitBlock(),
      };
    },
    blockTypeDefinition() {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypeDefinition(this.resolvedBlock.type);
    },
    isInherited() {
      return !!this.resolvedBlock.inherited;
    },
    assetFullsCount() {
      return this.assetBlockEditor.assetFullsCount();
    },
    isProjectProps() {
      return (
        !!this.assetBlockEditor.assetFull &&
        this.assetBlockEditor.assetFull.name === 'project_props'
      );
    },
  },
  watch: {
    isRenaming() {
      if (this.isRenamingState !== this.isRenaming) {
        this.$emit('update:is-renaming-state', this.isRenaming);
      }
    },
    isRenamingState() {
      if (this.isRenamingState !== this.isRenaming) {
        if (this.isRenamingState) {
          this.startRenaming();
        } else {
          this.cancelRenaming();
        }
      }
    },
    blockTypeDefinition() {
      this.toolbarRequested = false;
    },
  },
  mounted() {},
  methods: {
    async requestToolbarTargetSelf() {
      this.toolbarRequested = true;
      await this.$nextTick();
      return (this.$refs['toolbar'] ?? null) as HTMLElement | null;
    },
    isAssetUnreadAny,
    validateNewServiceName(name: string) {
      if (this.resolvedBlock.name === name) {
        return null;
      }
      const exists_block = this.assetBlockEditor.getBlockByName(name);
      if (!exists_block || !exists_block.own) {
        return null;
      }
      return this.$t('assetEditor.blockNameAlreadyInUse');
    },
    changeTitle(title: string) {
      this.makeChange(
        {
          title: title ? title.trim() : null,
        },
        true,
      );
    },
    makeChange(ch: Partial<AssetBlockChangable>, save: boolean = false) {
      this.assetBlockEditor.assetChanger.changeBlockParams(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        ch,
      );
      if (save) {
        this.commitBlock();
      }
    },
    async commitBlock(): Promise<DoTaskResult<void>> {
      this.savingError = null;

      this.saving = true;
      const epoch = ++this.savingEpoch;
      const res = await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.assetBlockEditor.commitBlock(this.resolvedBlock.id);
        });
      if (epoch === this.savingEpoch) {
        this.saving = false;
        this.savingError = res.error ? res.error.message : null;
      }
      return res;
    },
    async deleteBlock() {
      const answer = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('assetEditor.blockMenu.delete'),
          message: this.$t('assetEditor.blockMenu.deleteConfirm'),
          yesCaption: this.$t('common.dialogs.delete'),
          danger: true,
        });
      if (answer) {
        this.assetBlockEditor.assetChanger.deleteBlock(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
        );
        this.commitBlock();
      }
    },
    async renameBlock() {
      if (this.isInherited && !this.resolvedBlock.name) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            throw new Error(this.$t('errors.renameInheritedBlockWithoutName'));
          });
        return;
      }
      this.startRenaming();
    },
    async setServiceName() {
      const new_name = await this.$getAppManager()
        .get(DialogManager)
        .show(PromptDialog, {
          header: this.$t('common.dialogs.rename'),
          message: this.$t('profilePage.inputServiceBlockName'),
          yesCaption: this.$t('common.dialogs.rename'),
          value: this.resolvedBlock.name ?? '',
        });
      const new_name_error = this.validateNewServiceName(new_name ?? '');
      if (new_name !== undefined) {
        if (!new_name_error) {
          await this.$getAppManager()
            .get(UiManager)
            .doTask(async () => {
              this.assetBlockEditor.changeBlockServiceName(
                this.resolvedBlock,
                new_name ? new_name : null,
              );
            });
        } else this.$getAppManager().get(UiManager).showError(new_name_error);
      }
    },
    async createTask() {
      const asset = this.assetBlockEditor.assetEdited;
      if (!asset) return;
      if (!this.resolvedBlock || !this.assetBlockEditor.assetFull) return;
      const block = {
        title: this.resolvedBlock.title,
        type: 'block-mirror',
        index: 0,
        props: {
          asset: this.assetBlockEditor.assetFull.convertToAssetPropValue(),
          block_ref: stringifyAssetNewBlockRef(
            this.resolvedBlock.name,
            this.resolvedBlock.name ? null : this.resolvedBlock.id,
          ),
        },
      };
      const blockId = uuidv4();
      const blockRef = `@${blockId}`;
      await this.$getAppManager()
        .get(TaskManager)
        .showCreateTaskDialog(
          {
            title:
              convertTranslatedTitle(asset.title ?? '', (key) => this.$t(key)) +
              ': ' +
              castAssetPropValueToString(
                this.resolvedBlock.title
                  ? convertTranslatedTitle(this.resolvedBlock.title, (key) =>
                      this.$t(key),
                    )
                  : this.resolvedBlock.name,
              ),
            blocks: {
              [blockRef]: {
                ...block,
              },
            },
          },
          async (task) => {
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .requestAssetInstanceInCache(asset.id);
            await this.$getAppManager()
              .get(CreatorAssetManager)
              .createRef({
                where: {
                  id: [asset.id],
                },
                blockId: this.resolvedBlock.id,
                targetAssetId: task.id,
              });
          },
        );
    },
    async createRef() {
      const asset = this.assetBlockEditor.assetEdited;
      if (!asset) return;
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(DialogManager)
            .show(AssetRefsDialog, {
              assetIds: [asset.id],
              blockId: this.resolvedBlock.id,
            });
        });
    },
    async restoreInitialValues() {
      const answer = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('assetEditor.blockMenu.restoreInitialValues'),
          message: this.$t('assetEditor.blockMenu.restoreInitialValuesConfirm'),
          yesCaption: this.$t('common.dialogs.yes'),
          danger: true,
        });
      if (answer) {
        this.assetBlockEditor.assetChanger.resetBlock(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
        );
        this.commitBlock();
      }
    },
    async editBlock() {
      if (this.isCollapsed) {
        this.$emit('update:isCollapsed', false);
        await this.$nextTick();
      }
      if (!this.$refs['content']) return false;
      return await (
        this.$refs['content'] as InstanceType<typeof EditorBlockContent>
      ).enterEditMode();
    },
    async revealBlock(anchor?: string) {
      if (this.isCollapsed) {
        this.$emit('update:isCollapsed', false);
        await this.$nextTick();
      }
      if (!this.$refs['content']) return false;

      if (!this.$refs['top']) {
        return false;
      }

      let element = anchor
        ? window.document.getElementById(
            makeAnchorTagId(this.resolvedBlock.id, anchor),
          )
        : null;
      if (!element) element = this.$refs['top'] as HTMLElement;

      scrollIntoViewIfNeeded(element as HTMLElement, {
        behavior: 'smooth',
        scrollMode: 'if-needed',
      });

      if (!anchor) return true;

      return await (
        this.$refs['content'] as InstanceType<typeof EditorBlockContent>
      ).revealBlockAnchor(anchor);
    },
    startRenaming() {
      this.isRenaming = true;
    },
    cancelRenaming() {
      this.isRenaming = false;
    },
    editorBlockContentClicked(ev: MouseEvent) {
      if (this.isReadOnly) return;
      if (!ev.target) return;
      if (isElementInteractive(ev.target as HTMLElement)) return;
      if (this.assetBlockEditor.editingBlockId !== this.resolvedBlock.id) {
        this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.EditorBlock-stateEdit {
  width: 1px;
  height: 100%;
  position: absolute;
  left: 0px;
  opacity: 0;
  transition:
    opacity 0.2s,
    background-color 0.2s;
  z-index: 1;
}

.EditorBlock {
  &:not(.state-readonly):hover .EditorBlock-stateEdit {
    opacity: 1;
    background-color: var(--EditorBlock-hoverLine);
  }

  &,
  &:not(.state-readonly):hover {
    .EditorBlock-stateEdit.state-edit {
      opacity: 1;
      background-color: var(--color-main-yellow);
    }
  }
}

.EditorBlock {
  --EditorBlock-hoverLine: #666;
  color: var(--local-text-color);
  position: relative;

  &:hover,
  &.state-edit {
    .EditorBlock-menu,
    .EditorBlock-isReadOnly-icon,
    .EditorBlock-drag {
      opacity: 1;
      pointer-events: all;
    }

    .EditorBlock-notificationIcon {
      display: none;
    }
  }
  &.state-hide-content {
    min-height: 25px;
  }
}

.EditorBlock-menu.state-active {
  opacity: 1;
  pointer-events: all;
}

.EditorBlock[block-type='chat'] {
  .EditorBlock-stateEdit {
    opacity: 0 !important;
  }
}

.EditorBlock-leftControls,
.EditorBlock-rightControls {
  position: absolute;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  z-index: 1;

  :deep(.is-button i) {
    font-size: 16px;
  }
}

.EditorBlock-leftControls {
  left: 4px;

  .EditorBlock-drag {
    color: #666666;
    cursor: grab;
  }

  .EditorBlock-isReadOnly-icon {
    color: #666666;
  }

  .EditorBlock-saveErrorMarker {
    cursor: pointer;
    color: var(--soft-red);
  }
}

.EditorBlock-rightControls {
  right: 4px;
}

.EditorBlock-menu,
.EditorBlock-isReadOnly-icon,
.EditorBlock-drag {
  transition: opacity 0.1s;
  opacity: 0;
  pointer-events: none;
}

.EditorBlock-content,
.EditorBlock-header {
  padding: 0px var(--editor-block-padding-right) 0
    var(--editor-block-padding-left);
}

.EditorBlock-header {
  margin-bottom: 10px;
  display: flex;
  position: relative;
  align-items: center;
  break-inside: avoid;

  @include devices-mixins.device-type(mb) {
    display: grid;
    grid-template-columns: 1fr auto;

    .EditorBlock-header-title {
      grid-row: 1;
      grid-column: 1;
    }
    .EditorBlock-header-toolbar {
      grid-row: 2;
      grid-column: 1;
    }
    .EditorBlock-header-menu {
      grid-row: 1;
      grid-column: 2;
    }
  }
}

.EditorBlock-header-title {
  flex: 1;
  display: flex;

  .EditorBlock-create-header-suggestion {
    width: 100%;
    height: 27.57px;
    cursor: text;
    position: relative;
    border-bottom: 1px solid transparent;
    transition: border-bottom 0.2s;

    &:hover {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
  }
}

.EditorBlock-header-title-value {
  font-weight: bold;
  font-size: 20px;
  width: 100%;
  max-height: 50px !important;
}

.EditorBlock-header-name {
  font-size: var(--local-font-size);
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 5px;
  color: var(--local-sub-text-color);
}

.EditorBlock-content {
  position: relative;
  height: 100%;
}

.EditorBlock-saving {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.EditorBlock.state-error {
  .EditorBlock-header-title {
    color: var(--color-main-error);
  }
}

.EditorBlock-references {
  padding-left: 25px;
  margin-top: 10px;
  --editor-block-padding-right: 0px;
  --editor-block-padding-left: 0px;
}

.EditorBlock-header-menu {
  display: flex;
  position: relative;
  align-items: center;
}
.EditorBlock-notificationIcon {
  position: absolute;
  right: 2px;
  top: 5px;
  font-size: 10px;
  color: var(--color-accent);
}
</style>
