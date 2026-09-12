<template>
  <div
    v-if="hasAssets"
    class="AssetBlockEditor"
    :class="{ 'has-comments': hasComments }"
  >
    <div ref="blocksWrapRef" class="AssetBlockEditor-list">
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
            @paste-blocks="pasteBlocksFromClipboard"
          ></editor-block-separator>
          <div
            class="AssetBlockEditorCommon-block"
            :class="{
              'state-collapsed':
                allowCollapseBlocks && getBlockIsCollapsed(item.id),
              'has-select': selectionEnabled,
              'state-selected':
                selectionEnabled && assetBlockEditor.isBlockSelected(item.id),
            }"
          >
            <editor-block
              :ref="(el) => setEditorRef(item, index, el)"
              class="AssetBlockEditor-block"
              :resolved-block="item"
              :asset-block-editor="assetBlockEditor"
              :readonly="isReadonly"
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
            >
              <template #left-actions>
                <div class="AssetBlockEditor-leftActions">
                  <i
                    v-if="canDragBlocks"
                    class="EditorBlock-drag ri-draggable"
                  ></i>
                  <div
                    v-if="selectionEnabled"
                    class="AssetBlockEditor-select"
                    :class="{
                      checked: assetBlockEditor.isBlockSelected(item.id),
                    }"
                    :title="$t('assetEditor.blockSelectionHint')"
                    @mousedown.prevent.stop="
                      onSelBlockMouseDown(item.id, $event)
                    "
                  >
                    <i
                      :class="
                        assetBlockEditor.isBlockSelected(item.id)
                          ? 'ri-checkbox-circle-line'
                          : 'ri-checkbox-blank-circle-line'
                      "
                    ></i>
                  </div>
                </div>
              </template>
              <template #header-actions>
                <asset-block-hide-button
                  v-if="item.title && allowCollapseBlocks"
                  class="AssetBlockEditor-hideButton"
                  :is-collapsed="getBlockIsCollapsed(item.id)"
                  @update:is-collapsed="setBlockIsCollapsed(item.id, $event)"
                ></asset-block-hide-button>
              </template>
            </editor-block>
            <asset-block-comment
              v-if="showComments && !isDesktop"
              :ref="(el) => setBlockCommentRef(item, index, el)"
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
        v-if="selLineVisible"
        class="AssetBlockEditor-selLine"
        :style="selLineStyle"
      ></div>

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
      @paste-blocks="pasteBlocksFromClipboard"
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
      commentRefs: new Map<
        string,
        {
          component: InstanceType<typeof AssetBlockComment>;
          id: string;
        }
      >(),
      renamingBlockId: null as string | null,
      openedComment: null as null | string,
      selDragActive: false,
      selAnchorId: null as null | string,
      selCursorId: null as null | string,
      selCursorYLocal: 0,
      selCursorClientY: 0,
      selDownY: 0,
      selLineVisible: false,
      selLineStyle: { top: '0px', height: '0px' } as {
        top: string;
        height: string;
      },
      selAutoScrollRaf: null as number | null,
      selAutoScrollDir: 0,
      selAutoScrollSpeed: 0,
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
    selectionEnabled() {
      return this.canDragBlocks;
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
    resolvedBlocksFilteredList() {
      this.assetBlockEditor.pruneBlockSelection();
    },
  },
  async mounted() {
    this.$emit('update:is-dirty', this.isDirty);
    document.addEventListener('mousemove', this.onSelDocMouseMove);
    document.addEventListener('mouseup', this.onSelMouseUp);

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
  beforeUnmount() {
    this.cancelSelAutoScroll();
    document.removeEventListener('mousemove', this.onSelDocMouseMove);
    document.removeEventListener('mouseup', this.onSelMouseUp);
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
    setBlockCommentRef(
      resolved_block: ResolvedAssetBlock,
      index: number,
      el: InstanceType<typeof AssetBlockComment>,
    ) {
      if (!el) this.commentRefs.delete(resolved_block.id + '|' + index);
      else {
        this.commentRefs.set(resolved_block.id + '|' + index, {
          component: el,
          id: resolved_block.id,
        });
      }
    },
    getBlockCommentComponent(
      block_id: string,
    ): InstanceType<typeof AssetBlockComment> | null {
      for (const [_key, comp_ent] of this.commentRefs) {
        if (block_id === comp_ent.id) return comp_ent.component;
      }
      return null;
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
      // Проверяю если комментарий, то передаю в AssetBlockEditorComment какое сообщение необходимо отобразить
      // За поиск реплая отвечает ChatBlock
      let has_comment = false;
      if (anchor && anchor.startsWith('comment-')) {
        has_comment = true;
      }
      const block_comp = this.getEditorBlockComponent(blockId);
      if (!block_comp) return false;
      const block_reveal_res = await block_comp.revealBlock(
        has_comment ? undefined : anchor,
      );
      if (!block_reveal_res) return false;
      if (has_comment) {
        const [comment, content] = anchor!.split('~');
        const comment_id = comment.substring('comment-'.length);
        this.openedComment = blockId;
        await this.$nextTick();

        let reply_id;
        if (content && content.startsWith('reply-')) {
          reply_id = content.substring('reply-'.length);
        }
        if (reply_id) {
          const comment_block = this.getBlockCommentComponent(blockId);
          if (comment_block) {
            comment_block.revealCommentReply(reply_id);
          }
        }
      }
      return block_reveal_res;
    },
    getSelBlockIndexById(block_id: string) {
      return this.resolvedBlocksFilteredList.findIndex(
        (item) => item.id === block_id,
      );
    },
    getSelCursorYLocal(ev: MouseEvent) {
      const wrap = this.$refs['blocksWrapRef'] as HTMLElement | null;
      if (!wrap) return 0;
      return ev.clientY - wrap.getBoundingClientRect().top;
    },
    selRowIndexAt(y_local: number) {
      const wrap = this.$refs['blocksWrapRef'] as HTMLElement | null;
      if (!wrap) return -1;
      const items = Array.from(
        wrap.querySelectorAll('.AssetBlockEditorCommon-block'),
      );
      if (items.length === 0) return -1;
      const wrap_top = wrap.getBoundingClientRect().top;
      const tops = items.map((el) => el.getBoundingClientRect().top - wrap_top);
      const bottoms = items.map(
        (el) => el.getBoundingClientRect().bottom - wrap_top,
      );
      if (y_local <= tops[0]) return 0;
      const last_index = items.length - 1;
      if (y_local >= bottoms[last_index]) return last_index;
      for (let i = 0; i < last_index; i++) {
        if (y_local >= tops[i] && y_local < bottoms[i]) return i;
        if (y_local >= bottoms[i] && y_local < tops[i + 1]) {
          return y_local - bottoms[i] < tops[i + 1] - y_local ? i : i + 1;
        }
      }
      return last_index;
    },
    applySelRange() {
      const from = this.getSelBlockIndexById(this.selAnchorId ?? '');
      const to = this.getSelBlockIndexById(this.selCursorId ?? '');
      if (from < 0 || to < 0) return;
      const selected = this.assetBlockEditor.selectedBlockIds;
      selected.clear();
      for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
        selected.add(this.resolvedBlocksFilteredList[i].id);
      }
    },
    onSelBlockMouseDown(block_id: string, ev: MouseEvent) {
      if (ev.button !== 0) return;
      this.selDragActive = true;
      this.selAnchorId = block_id;
      this.selCursorId = block_id;
      this.selDownY = ev.clientY;
      this.selCursorYLocal = this.getSelCursorYLocal(ev);
      this.updateSelLine();
    },
    onSelDocMouseMove(ev: MouseEvent) {
      if (!this.selDragActive) return;
      const wrap = this.$refs['blocksWrapRef'] as HTMLElement | null;
      if (!wrap) return;
      const wrap_rect = wrap.getBoundingClientRect();
      const y_local = ev.clientY - wrap_rect.top;
      this.selCursorClientY = ev.clientY;
      this.selCursorYLocal = Math.min(Math.max(y_local, 0), wrap_rect.height);
      const index = this.selRowIndexAt(y_local);
      if (index >= 0) {
        const block_id = this.resolvedBlocksFilteredList[index].id;
        if (block_id !== this.selCursorId) {
          this.selCursorId = block_id;
          this.applySelRange();
        }
      }
      this.updateSelAutoScroll(ev.clientY);
      this.updateSelLine();
    },
    onSelMouseUp(ev: MouseEvent) {
      if (!this.selDragActive) return;
      const moved = Math.abs(ev.clientY - this.selDownY) > 4;
      const anchor_id = this.selAnchorId;
      this.selDragActive = false;
      this.selAnchorId = null;
      this.selCursorId = null;
      this.cancelSelAutoScroll();
      this.updateSelLine();
      if (!moved && anchor_id) {
        this.assetBlockEditor.toggleBlockSelected(anchor_id);
      }
    },
    getSelScrollContainer(): HTMLElement | null {
      const wrap = this.$refs['blocksWrapRef'] as HTMLElement | null;
      if (!wrap) return null;
      let el: HTMLElement | null = wrap.parentElement;
      while (el) {
        const overflow_y = getComputedStyle(el).overflowY;
        if (
          overflow_y === 'auto' ||
          overflow_y === 'scroll' ||
          overflow_y === 'overlay'
        ) {
          if (el.scrollHeight > el.clientHeight) return el;
        }
        el = el.parentElement;
      }
      return null;
    },
    updateSelAutoScroll(clientY: number) {
      const scroll_container = this.getSelScrollContainer();
      const rect = scroll_container
        ? scroll_container.getBoundingClientRect()
        : null;
      const top = rect ? rect.top : 0;
      const bottom = rect ? rect.bottom : window.innerHeight;
      const edge_zone = 60;
      let dir = 0;
      let speed = 0;
      if (clientY < top + edge_zone) {
        dir = -1;
        speed = Math.min(100, 15 + (top + edge_zone - clientY) * 0.7);
      } else if (clientY > bottom - edge_zone) {
        dir = 1;
        speed = Math.min(100, 15 + (clientY - (bottom - edge_zone)) * 0.7);
      }
      this.selAutoScrollDir = dir;
      this.selAutoScrollSpeed = speed;
      if (dir !== 0) {
        if (!this.selAutoScrollRaf) {
          this.selAutoScrollRaf = requestAnimationFrame(() =>
            this.selAutoScrollTick(),
          );
        }
      } else {
        this.cancelSelAutoScroll();
      }
    },
    cancelSelAutoScroll() {
      if (this.selAutoScrollRaf !== null) {
        cancelAnimationFrame(this.selAutoScrollRaf);
        this.selAutoScrollRaf = null;
      }
    },
    selAutoScrollTick() {
      const wrap = this.$refs['blocksWrapRef'] as HTMLElement | null;
      if (!this.selDragActive || !wrap || this.selAutoScrollDir === 0) {
        this.cancelSelAutoScroll();
        return;
      }
      const scroll_container = this.getSelScrollContainer();
      if (scroll_container) {
        const max_scroll =
          scroll_container.scrollHeight - scroll_container.clientHeight;
        scroll_container.scrollTop = Math.min(
          Math.max(
            scroll_container.scrollTop +
              this.selAutoScrollDir * this.selAutoScrollSpeed,
            0,
          ),
          max_scroll,
        );
      } else {
        window.scrollBy(0, this.selAutoScrollDir * this.selAutoScrollSpeed);
      }
      const wrap_rect = wrap.getBoundingClientRect();
      const y_local = this.selCursorClientY - wrap_rect.top;
      this.selCursorYLocal = Math.min(Math.max(y_local, 0), wrap_rect.height);
      const index = this.selRowIndexAt(y_local);
      if (index >= 0) {
        const block_id = this.resolvedBlocksFilteredList[index].id;
        if (block_id !== this.selCursorId) {
          this.selCursorId = block_id;
          this.applySelRange();
        }
      }
      this.updateSelLine();
      this.selAutoScrollRaf = requestAnimationFrame(() =>
        this.selAutoScrollTick(),
      );
    },
    updateSelLine() {
      const wrap = this.$refs['blocksWrapRef'] as HTMLElement | null;
      if (!this.selDragActive || !wrap) {
        this.selLineVisible = false;
        return;
      }
      const anchor_index = this.getSelBlockIndexById(this.selAnchorId ?? '');
      if (anchor_index < 0) {
        this.selLineVisible = false;
        return;
      }
      const items = Array.from(
        wrap.querySelectorAll('.AssetBlockEditorCommon-block'),
      );
      const anchor_el = items[anchor_index] as HTMLElement | undefined;
      if (!anchor_el) {
        this.selLineVisible = false;
        return;
      }
      const wrap_top = wrap.getBoundingClientRect().top;
      const select_el = anchor_el.querySelector(
        '.AssetBlockEditor-select',
      ) as HTMLElement | null;
      if (!select_el) {
        this.selLineVisible = false;
        return;
      }
      const select_rect = select_el.getBoundingClientRect();
      const anchor_center_y =
        select_rect.top + select_rect.height / 2 - wrap_top;
      const top = Math.min(anchor_center_y, this.selCursorYLocal);
      const bottom = Math.max(anchor_center_y, this.selCursorYLocal);
      this.selLineStyle = {
        top: `${top}px`,
        height: `${Math.max(bottom - top, 2)}px`,
      };
      this.selLineVisible = true;
    },
    async pasteBlocksFromClipboard(from_index?: number, to_index?: number) {
      await this.assetBlockEditor.pasteBlocksFromClipboard(
        from_index,
        to_index,
      );
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
  position: relative;
}

.AssetBlockEditor :deep(.SortableList-item) {
  margin-bottom: 6px;
}

.AssetBlockEditor
  :deep(.SortableList-item.sortable-ghost)
  .AssetBlockEditorCommon-block {
  opacity: 0.35;
}

.AssetBlockEditor
  :deep(.SortableList-item.sortable-chosen)
  .AssetBlockEditorCommon-block {
  border-color: var(--color-accent);
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
  opacity: 1;
  flex: none;
  align-self: center;
  transition: opacity 0.16s ease;
  &:deep(> button) {
    padding: 0.33em 0.1em;
  }
}
.AssetBlockEditorCommon-block {
  position: relative;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease;

  &:hover {
    background: color-mix(in srgb, var(--local-border-color) 45%, transparent);
    border-color: var(--local-border-color);

    .AssetBlockEditor-commentButton {
      opacity: 1;
    }
  }

  &.has-select {
    margin-left: -25px;
    display: flex;
    align-items: stretch;
    --editor-block-padding-left: 50px;

    .AssetBlockEditor-block {
      flex: 1;
      min-width: 0;
    }
  }

  &.state-selected {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }
}

.AssetBlockEditor-leftActions {
  padding-top: 2px;
  position: relative;
  display: flex;
  z-index: 1;
}

.AssetBlockEditor-leftActions .EditorBlock-drag {
  flex: none;
  width: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  cursor: grab;
  color: transparent;
  transition: color 0.16s ease;

  i {
    font-size: 16px;
  }

  &:active {
    cursor: grabbing;
  }
}

.AssetBlockEditorCommon-block:hover
  .AssetBlockEditor-leftActions
  .EditorBlock-drag {
  color: var(--local-sub-text-color);
}

.AssetBlockEditor-select {
  width: 22px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  color: var(--local-border-color);
  opacity: 0;
  transition: opacity 0.16s ease;

  &:not(.checked) {
    &:hover {
      color: var(--color-accent);
    }
  }

  &.checked {
    color: var(--color-accent);
  }
}

.AssetBlockEditorCommon-block:hover .AssetBlockEditor-select,
.AssetBlockEditor-select.checked {
  opacity: 1;
}

.AssetBlockEditorCommon-block:has(.EditorBlock.state-edit) {
  border-color: var(--local-border-color);
  background: color-mix(in srgb, var(--local-border-color) 45%, transparent);
}

.AssetBlockEditor-selLine {
  position: absolute;
  left: 8px;
  width: 2px;
  border-radius: 2px;
  background: var(--color-accent);
  opacity: 0.85;
  pointer-events: none;
  z-index: 2;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--color-accent);
    box-shadow: 0 0 0 3px
      color-mix(in srgb, var(--color-accent) 18%, transparent);
  }

  &::before {
    top: -5.5px;
  }

  &::after {
    bottom: -5.5px;
  }
}
</style>
