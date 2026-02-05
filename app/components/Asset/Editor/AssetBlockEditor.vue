<template>
  <div
    v-if="hasAssets"
    class="AssetBlockEditor"
    :class="{ 'has-comments': hasComments }"
  >
    <div class="AssetBlockEditor-list">
      <sortable-list
        handle-selector=".EditorBlock-drag"
        id-key="id"
        :list="resolvedBlocksFilteredList"
        :disabled="!canDragBlocks"
        :get-item-class-name="getItemClassName"
        @update:list="changeList($event)"
      >
        <template #default="{ item, index }">
          <editor-block-separator
            :disabled="renamingBlockId === item.id || isReadonly"
            :item="item"
            :from-list-edge="index === 0 ? 'top' : null"
            :prev-item-index="
              index === 0 ? null : resolvedBlocksFilteredList[index - 1].index
            "
            :allow-add-blocks="canAddBlocks"
            @create-block="createBlock($event)"
            @create-title="createTitle($event)"
          ></editor-block-separator>
          <div
            class="AssetBlockEditorCommon-block"
            :class="{
              'state-collapsed':
                allowCollapseBlocks && getBlockIsCollapsed(item.id),
            }"
          >
            <asset-block-hide-button
              v-if="item.title && allowCollapseBlocks"
              class="AssetBlockEditor-hideButton"
              :is-collapsed="getBlockIsCollapsed(item.id)"
              @update:is-collapsed="setBlockIsCollapsed(item.id, $event)"
            ></asset-block-hide-button>
            <editor-block
              :ref="(el) => setEditorRef(item, index, el)"
              class="AssetBlockEditor-block"
              :resolved-block="item"
              :asset-block-editor="assetBlockEditor"
              :readonly="isReadonly"
              :draggable="canDragBlocks"
              :has-comments="hasComments"
              :is-renaming-state="renamingBlockId === item.id"
              :show-name="showNames"
              :allow-add-comments="showComments"
              :allow-delete-block="allowDeleteBlocks"
              :hide-links="hideBlockLinks"
              :is-collapsed="
                allowCollapseBlocks && getBlockIsCollapsed(item.id)
              "
              @update:is-renaming-state="
                renamingBlockId = $event ? item.id : null
              "
              @show-chat="openedComment = item.id"
              @update:is-collapsed="setBlockIsCollapsed(item.id, $event)"
            ></editor-block>
            <asset-block-comment
              v-if="showComments && !isDesktop"
              class="AssetBlockEditor-commentButton"
              :resolved-block="item"
              :asset-block-editor="assetBlockEditor"
              :opened-comment="openedComment ?? undefined"
              @open-comment="openedComment = $event"
            ></asset-block-comment>
          </div>
          <editor-block-separator
            v-if="
              index === resolvedBlocksFilteredList.length - 1 && !isReadonly
            "
            :item="item"
            :from-list-edge="'bottom'"
            :allow-add-blocks="canAddBlocks"
            @create-block="createBlock($event)"
          ></editor-block-separator>
        </template>
      </sortable-list>

      <div
        v-if="rootCombinedReferences.length > 0 && !hideRootLinks"
        class="AssetBlockEditor-references"
      >
        <div class="AssetBlockEditor-references-header">
          {{ $t('gddPage.referencesBlockHeader') }}
        </div>
        <asset-reference-list
          class="AssetBlockEditor-references-content"
          :combined-references="rootCombinedReferences"
          :asset-block-editor="assetBlockEditor"
        ></asset-reference-list>
      </div>
    </div>

    <asset-add-block-dropdown
      v-if="canAddBlocks"
      @create-block="createBlock({ blockType: $event })"
    ></asset-add-block-dropdown>
  </div>
  <div v-else class="AssetBlockEditor-load">
    <div class="loaderSpinner PageLoaderSpinner"></div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineAsyncComponent, defineComponent } from 'vue';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import UiManager from '../../../logic/managers/UiManager';
import SortableList from '../../Common/SortableList.vue';
import AssetReferenceList from './../References/AssetReferenceList.vue';
import { AssetRights } from '../../../logic/types/Rights';
import type { AssetPropValueEnum } from '../../../logic/types/Props';
import ProjectManager from '../../../logic/managers/ProjectManager';
import EditorBlockSeparator from './EditorBlockSeparator.vue';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import {
  COLLECTION_PID,
  COLLECTION_GAME_ASSET_ID,
  ARTICLE_ASSET_ID,
  BLOCK_NAME_META,
} from '../../../logic/constants';
import AuthManager from '../../../logic/managers/AuthManager';
import AssetAddBlockDropdown from './AssetAddBlockDropdown.vue';
import AssetBlockComment from './AssetBlockComment.vue';
import EditorManager from '../../../logic/managers/EditorManager';
import AssetBlockHideButton from './AssetBlockHideButton.vue';
import UiPreferenceManager from '../../../logic/managers/UiPreferenceManager';
import type EditorBlock from './EditorBlock.vue';

export function getBlockIsHiddenPreferenceKey(
  projectId: string,
  assetId: string,
  blockId: string,
) {
  return `hide-block-${projectId}-${assetId}-${blockId}`;
}

export default defineComponent({
  name: 'AssetBlockEditor',
  components: {
    EditorBlock: defineAsyncComponent(() => import('./EditorBlock.vue')),
    SortableList,
    AssetReferenceList,
    EditorBlockSeparator,
    AssetAddBlockDropdown,
    AssetBlockComment,
    AssetBlockHideButton,
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    filterBlocks: {
      type: [Function, null] as PropType<
        ((block: ResolvedAssetBlock) => boolean) | null
      >,
      default: null,
    },
    allowAddBlocks: {
      type: Boolean,
      default: true,
    },
    allowDeleteBlocks: {
      type: Boolean,
      default: true,
    },
    allowDragBlocks: {
      type: Boolean,
      default: true,
    },
    hideRootLinks: {
      type: Boolean,
      default: false,
    },
    hideBlockLinks: {
      type: Boolean,
      default: false,
    },
    showComments: {
      type: Boolean,
      default: false,
    },
    showNames: {
      type: Boolean,
      default: true,
    },
    allowCollapseBlocks: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:is-dirty'],
  data() {
    return {
      saving: false,
      editorRefs: new Map<
        string,
        {
          component: InstanceType<typeof EditorBlock>;
          id: string;
        }
      >(),
      renamingBlockId: null as string | null,
      openedComment: null,
    };
  },
  computed: {
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    hasComments(): boolean {
      const comments_count =
        this.assetBlockEditor.assetFull?.comments.length ?? 0;
      return comments_count > 0;
    },
    blockTypes() {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypesList()
        .filter((x) => !x.hideInAdding);
    },
    resolvedBlocks() {
      return this.assetBlockEditor.resolveBlocks();
    },
    hasAssets() {
      return this.assetBlockEditor.assetFullsCount() > 0;
    },
    assetFullsCount() {
      return this.assetBlockEditor.assetFullsCount();
    },
    isReadonly() {
      return this.assetBlockEditor.getIsReadonly();
    },
    canChangeAssets() {
      return !this.isReadonly;
    },
    canDragBlocks() {
      return this.assetBlockEditor.canDragBlocks() && this.allowDragBlocks;
    },
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    allowAnonymUsers() {
      return this.$getAppManager().get(ProjectManager).getAllowAnonymUsers();
    },
    canAddBlocks() {
      return (
        this.assetBlockEditor.canAddBlocks() &&
        (!!this.userInfo || this.allowAnonymUsers) &&
        this.allowAddBlocks
      );
    },
    rootCombinedReferences() {
      return this.assetBlockEditor.getRootCombinedReferences();
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    resolvedBlocksFilteredList(): ResolvedAssetBlock[] {
      let additional_hidden: string[] = [];
      const is_collection =
        this.projectInfo &&
        !!this.projectInfo.parentsTree.find((p) => p.id === COLLECTION_PID);
      if (this.assetBlockEditor.assetFull && is_collection) {
        const asset = this.assetBlockEditor.assetFull;
        if (
          asset &&
          asset.name !== 'game_base' &&
          asset.typeIds &&
          asset.typeIds.includes(COLLECTION_GAME_ASSET_ID)
        ) {
          const game_type_enum = asset.getPropValue('props', 'type').value;
          const game_type = game_type_enum
            ? (game_type_enum as AssetPropValueEnum).Name
            : null;
          if (game_type !== 'Application') {
            additional_hidden = [
              'application-hint',
              'application-chat',
              '@2d20ab92-5f19-442f-b06d-77a6260e1d4d',
            ];
          }
        }
      }
      if (
        this.assetBlockEditor.assetFull &&
        this.assetBlockEditor.assetFull.typeIds.includes(ARTICLE_ASSET_ID)
      ) {
        additional_hidden.push('props');
      }
      return this.resolvedBlocks.list.filter((item) => {
        if (this.filterBlocks) {
          if (!this.filterBlocks(item)) return false;
        }

        if (item.name) {
          if (additional_hidden.includes(item.name)) {
            return false;
          }
          if (item.name === BLOCK_NAME_META) {
            return false;
          }
        }
        return item.rights > AssetRights.NO;
      });
    },
    isDirty() {
      return this.assetBlockEditor.getHasChanges();
    },
  },
  watch: {
    isDirty() {
      this.$emit('update:is-dirty', this.isDirty);
    },
  },
  async mounted() {
    this.$emit('update:is-dirty', this.isDirty);

    // Focus first empty text block
    if (!this.isReadonly) {
      for (const block_type_to_focus of ['text', 'markdown']) {
        const block_to_focus = this.assetBlockEditor.assetFull?.blocks.find(
          (b) => b.type === block_type_to_focus,
        );
        if (block_to_focus && !block_to_focus.computed.value) {
          await this.focusByBlockId(block_to_focus.id);
          break;
        }
      }
    }
  },
  methods: {
    getBlockIsCollapsed(blockId: string) {
      const asset = this.assetBlockEditor.assetFull;
      if (!asset) return false;
      const key = getBlockIsHiddenPreferenceKey(
        asset.projectId,
        asset.id,
        blockId,
      );
      return this.$getAppManager()
        .get(UiPreferenceManager)
        .getPreference(key, false);
    },
    setBlockIsCollapsed(blockId: string, val: boolean) {
      const asset = this.assetBlockEditor.assetFull;
      if (!asset) return false;
      const key = getBlockIsHiddenPreferenceKey(
        asset.projectId,
        asset.id,
        blockId,
      );
      return this.$getAppManager()
        .get(UiPreferenceManager)
        .setPreference(key, val);
    },
    getItemClassName(item: ResolvedAssetBlock) {
      return `Sortable-list-item-${item.type}`;
    },
    changeRenamingBlockState(state: boolean, block_id: string) {
      this.renamingBlockId = null;
      if (state) {
        this.renamingBlockId = block_id;
      }
    },
    getEditorBlockComponent(
      block_id: string,
    ): InstanceType<typeof EditorBlock> | null {
      for (const [_key, comp_ent] of this.editorRefs) {
        if (block_id === comp_ent.id) return comp_ent.component;
      }
      return null;
    },
    setEditorRef(resolved_block: ResolvedAssetBlock, index: number, el: any) {
      if (!el) this.editorRefs.delete(resolved_block.id + '|' + index);
      else {
        this.editorRefs.set(resolved_block.id + '|' + index, {
          component: el,
          id: resolved_block.id,
        });
      }
    },
    createTitle(block_id: string) {
      this.renamingBlockId = block_id;
    },
    setDataTransfer(data_transfer: any, drag_el: any) {
      const panel_name =
        drag_el.querySelector('.EditorBlock-drag').dataset.panelName;
      data_transfer.setData('panel_id', panel_name);
    },
    createBlock(params: { blockType: string; index?: number }) {
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const created_block = await this.assetBlockEditor.createBlock(
            params.blockType,
            { index: params.index },
          );
          if (!created_block) return;

          if (
            this.blockTypes.find((b) => b.name === params.blockType)
              ?.focusOnAdded
          ) {
            await this.focusByBlockId(created_block.id);
          }

          await this.assetBlockEditor.commitBlock(created_block.id);
        });
    },
    async focusByBlockId(blockId: string) {
      await this.$nextTick();
      const component = this.getEditorBlockComponent(blockId);
      if (component) {
        component.editBlock();
      }
    },
    async changeList(reordered_blocks: ResolvedAssetBlock[]) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.assetBlockEditor.reorderBlocks(reordered_blocks);
        });
    },
    async discardChanges() {
      this.saving = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.assetBlockEditor.assetChanger.discard();
        });
      this.saving = false;
    },
    async saveChanges() {
      this.saving = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.assetBlockEditor.saveChanges();
        });
      this.saving = false;
    },
    async revealAssetBlock(blockId: string, anchor?: string): Promise<boolean> {
      const block_comp = this.getEditorBlockComponent(blockId);
      if (!block_comp) return false;
      return block_comp.revealBlock(anchor);
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.EditorBlock-wrapper {
  position: relative;
}

.EditorBlock-separator-lower {
  background-color: rgba(255, 255, 255, 0.1);
}

.AssetBlockEditor {
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  padding-bottom: 10px;
  padding-top: 10px;
  --panel-padding: 0;
  @include devices-mixins.device-type(not-pc) {
    &.has-comments {
      margin-right: 20px;
    }
  }
}

.AssetBlockEditor-list {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}

.AssetBlockEditor-load {
  height: 100%;
  align-items: center;
  display: flex;
}

.AssetBlockEditor-addBlock {
  width: 100%;
}

.AssetBlockEditor-differentBlocks {
  background: #2c2b29;
  padding: 15px 20px;
  text-align: center;
  font-style: italic;
  color: #999;
  border-radius: 4px;
}

.AssetBlockEditor-references-header {
  margin-bottom: 12px;
  font-weight: bold;
  padding-left: 18px;
}

.AssetBlockEditor-savingBlock {
  position: sticky;
  bottom: 0px;
  margin-top: 10px;
}

.AssetBlockEditor-hideButton {
  opacity: 0;
  position: absolute;
  top: 0;
  left: -30px;
}
.AssetBlockEditorCommon-block {
  position: relative;
  &:hover {
    .AssetBlockEditor-commentButton,
    .AssetBlockEditor-hideButton {
      opacity: 1;
    }
  }
  &.state-collapsed {
    .AssetBlockEditor-hideButton {
      opacity: 1;
    }
  }
}
</style>
