<template>
  <div v-if="hasAssets" class="AssetBlockDetachedEditor">
    <sortable-list
      class="AssetBlockDetachedEditor-list"
      handle-selector=".EditorBlock-drag"
      id-key="id"
      :list="resolvedBlocksFilteredList"
      :disabled="!canDragBlocks"
      @update:list="changeList($event)"
    >
      <template #default="{ item, index }">
        <editor-block
          :ref="(el) => setEditorRef(item, index, el)"
          class="AssetBlockDetachedEditor-block"
          :resolved-block="item"
          :asset-block-editor="assetBlockEditor"
          :readonly="isReadonly"
          :draggable="canDragBlocks"
        ></editor-block>
      </template>
    </sortable-list>
    <asset-add-block-dropdown
      v-if="canAddBlocks"
      @create-block="createBlock({ blockType: $event })"
    ></asset-add-block-dropdown>
  </div>
</template>
<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import type EditorBlock from './EditorBlock.vue';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import type { AssetPropValueEnum } from '../../../logic/types/Props';
import ProjectManager from '../../../logic/managers/ProjectManager';
import { AssetRights } from '../../../logic/types/Rights';
import UiManager from '../../../logic/managers/UiManager';
import SortableList from '../../Common/SortableList.vue';
import { COLLECTION_PID, COLLECTION_GAME_ASSET_ID } from '../../../logic/constants';
import AuthManager from '../../../logic/managers/AuthManager';
import AssetAddBlockDropdown from './AssetAddBlockDropdown.vue';
import EditorManager from '../../../logic/managers/EditorManager';

export default defineComponent({
  name: 'AssetBlockDetachedEditor',
  components: {
    EditorBlock: defineAsyncComponent(() => import('./EditorBlock.vue')),
    SortableList,
    AssetAddBlockDropdown,
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    hiddenBlockNames: {
      type: Array<string>,
      default: () => [],
    },
    type: {
      type: String,
      default: null,
    },
  },
  emits: ['update:is-dirty'],
  data() {
    return {
      editorRefs: new Map<
        string,
        {
          component: InstanceType<typeof EditorBlock>;
          id: string;
        }
      >(),
    };
  },
  computed: {
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    allowAnonymUsers() {
      return this.$getAppManager().get(ProjectManager).getAllowAnonymUsers();
    },
    canAddBlocks() {
      return (
        this.assetBlockEditor.canAddBlocks() &&
        (!!this.userInfo || this.allowAnonymUsers)
      );
    },
    blockTypes() {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypesList()
        .filter((x) => !x.hideInAdding);
    },
    canDragBlocks() {
      return this.assetBlockEditor.canDragBlocks();
    },
    isReadonly() {
      return this.assetBlockEditor.getIsReadonly();
    },
    resolvedBlocks() {
      return this.assetBlockEditor.resolveBlocks();
    },
    hasAssets() {
      return this.assetBlockEditor.assetFullsCount() > 0;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    resolvedBlock() {
      return this.resolvedBlocksFilteredList[0];
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
          const game_type_enum = asset.getPropValue('props', '\\type').value;
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
      return this.resolvedBlocks.list.filter((item) => {
        if (item.name) {
          if (
            this.hiddenBlockNames.includes(item.name) ||
            additional_hidden.includes(item.name)
          ) {
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
  mounted() {
    this.$emit('update:is-dirty', this.isDirty);
  },
  methods: {
    getEditorBlockComponent(
      block_id: string,
    ): InstanceType<typeof EditorBlock> | null {
      for (const [_key, comp_ent] of this.editorRefs) {
        if (block_id === comp_ent.id) return comp_ent.component;
      }
      return null;
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
          await this.$nextTick();
          const component = this.getEditorBlockComponent(created_block.id);
          if (
            component &&
            this.blockTypes.find((b) => b.name === params.blockType)
              ?.focusOnAdded
          ) {
            component.editBlock();
          }

          await this.assetBlockEditor.commitBlock(created_block.id);
        });
    },
    async changeList(reordered_blocks: ResolvedAssetBlock[]) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.assetBlockEditor.reorderBlocks(reordered_blocks);
        });
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
    async revealAssetBlock(blockId: string, anchor?: string): Promise<boolean> {
      const block_comp = this.getEditorBlockComponent(blockId);
      if (!block_comp) return false;
      return block_comp.revealBlock(anchor);
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/new-vars-mixins.scss';

.AssetBlockDetachedEditor {
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  min-height: 100%;
  --editor-block-padding-left: 25px;
  --editor-block-padding-right: 25px;
}

.AssetBlockDetachedEditor-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.AssetBlockDetachedEditor:deep(.EditorBlock-content) {
  @include new-vars-mixins.is-panel;
  --editor-block-padding-left: 10px;
  --editor-block-padding-right: 10px;
}
:deep(.AddBlockDropdown) {
  margin-right: 0;
  margin-left: 0;
}

.AssetBlockDetachedEditor:deep(.EditorBlock-stateEdit) {
  opacity: 0 !important;
}

.AssetBlockDetachedEditor:deep(.EditorBlock-menu),
.AssetBlockDetachedEditor:deep(.EditorBlock-drag) {
  opacity: 1;
}
</style>
