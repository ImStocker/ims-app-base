<template>
  <tree-presenter
    ref="treePresenter"
    v-model:selection="treePresenterSelection"
    class="AssetContentTreePresenter"
    :tree-presenter-vm="treePresenterVM"
    :selection-mode="selectionKind === 'item' ? 'single' : 'multiple'"
    @item:click="_onItemClicked"
  >
    <template #node="{ item }">
      <block-with-menu
        class="AssetContentTreePresenter-node"
        :menu-list="getMenu(item)"
        :get-context-menu-list="() => getContextMenu(item)"
        menu-position="append"
      >
        <div
          class="AssetContentTreePresenter-node-content"
          :title="getTranslated(item.payload.title)"
        >
          <i
            v-if="getIconClass(item.payload)"
            :class="[
              getIconClass(item.payload),
              'AssetContentTreePresenter-node-icon',
            ]"
          ></i>
          <caption-string
            class="AssetContentTreePresenter-node-title"
            :value="item.payload.title"
          ></caption-string>
        </div>
      </block-with-menu>
    </template>
  </tree-presenter>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import TreePresenter from '../../Common/TreePresenter/TreePresenter.vue';
import type {
  TreePresenterItem,
  TreePresenterItemEvent,
} from '../../Common/TreePresenter/TreePresenter';
import type { BlockContentItem } from '../../../logic/types/BlockTypeDefinition';
import {
  AssetContentTreePresenterVM,
  type AssetContentTreePresenterPayload,
} from './AssetContentTreePresenterVM';
import CaptionString from '../../Common/CaptionString.vue';
import BlockWithMenu from '../../Common/BlockWithMenu.vue';
import { getIconClass } from '../../utils/ui';
import EditorManager from '../../../logic/managers/EditorManager';
import {
  convertTranslatedTitle,
  makeAnchorTagId,
} from '../../../logic/utils/assets';
import type { ExtendedMenuListItem } from '../../../logic/types/MenuList';
import type { EditorContextForAsset } from '../../../logic/types/EditorContextForAsset';
import ProjectManager from '../../../logic/managers/ProjectManager';
import { getProjectLinkHref } from '../../../logic/router/routes-helpers';
import { clipboardCopyPlainText } from '../../../logic/utils/clipboard';
import UiManager from '../../../logic/managers/UiManager';

export default defineComponent({
  name: 'AssetContentTreePresenter',
  components: {
    TreePresenter,
    CaptionString,
    BlockWithMenu,
  },
  props: {
    assetId: {
      type: String,
      required: true,
    },
    assetContents: {
      type: Array<BlockContentItem<any>>,
      required: true,
    },
    selection: {
      type: Array<string>,
      default: () => [],
    },
    editorContext: {
      type: Object as PropType<EditorContextForAsset>,
      required: true,
    },
    showMenu: {
      type: Boolean,
      default: true,
    },
    selectionKind: {
      type: String as PropType<'editor' | 'item'>,
      default: 'editor',
    },
  },
  emits: [
    'update:selection',
    'item:click',
    'item:dblclick',
    'item:expand',
    'item:collapse',
    'item:focus',
    'item:keydown',
    'select',
  ],
  data() {
    return {
      treePresenterVM: new AssetContentTreePresenterVM(),
    };
  },
  computed: {
    treePresenterSelection: {
      get(): TreePresenterItem<AssetContentTreePresenterPayload>[] {
        return this.selection.map((sel) => {
          return {
            id: sel,
            payload: null as any,
          };
        });
      },
      set(val: TreePresenterItem<AssetContentTreePresenterPayload>[]) {
        this.$emit(
          'update:selection',
          val
            .filter((v) => {
              if (this.selectionKind === 'editor') {
                return v.payload === null || v.payload.selectable;
              } else {
                return true;
              }
            })
            .map((v) => {
              return v.id;
            }),
        );
      },
    },
    revealedContentIds() {
      return this.$getAppManager()
        .get(EditorManager)
        .getRevealedContentIds(this.assetId);
    },
  },
  watch: {
    assetContents() {
      this.treePresenterVM.setContent(this.assetContents);
    },
    revealedContentIds() {
      if (this.revealedContentIds && this.revealedContentIds.length > 0) {
        this.treePresenterVM.revealContentListById(this.revealedContentIds);
      }
    },
  },
  created() {
    this.treePresenterVM.setContent(this.assetContents);
    if (this.revealedContentIds && this.revealedContentIds.length > 0) {
      this.treePresenterVM.revealContentListById(this.revealedContentIds);
    }
  },
  methods: {
    focus() {
      const treePresenter = this.$refs['treePresenter'] as InstanceType<
        typeof TreePresenter
      > | null;
      if (!treePresenter) return;
      treePresenter.focus();
    },
    getIconClass(option: BlockContentItem<any>) {
      if (!option.icon) return null;
      return getIconClass(option.icon, 'dropdown-icon-');
    },
    async _onItemClicked(e: TreePresenterItemEvent<BlockContentItem<any>>) {
      if (e.target.item.payload.anchor !== undefined) {
        this.$emit('select', {
          assetId: e.target.item.id,
          blockId: e.target.item.payload.blockId,
          anchor: e.target.item.payload.anchor,
          selectable: e.target.item.payload.selectable,
          title: e.target.item.title,
        });
      }
    },
    getTranslated(text: string) {
      return convertTranslatedTitle(text, (...args) => this.$t(...args));
    },
    getMenu(
      item: TreePresenterItem<BlockContentItem<any>>,
    ): ExtendedMenuListItem[] {
      if (!this.showMenu) {
        return [];
      }
      let res: ExtendedMenuListItem[] = [];
      if (this.editorContext.getMountedAssetBlockEditor()) {
        res = [
          ...this.editorContext.getContentItemsMenu(item.payload.blockId, [
            item.payload,
          ]),
        ];
      }
      if (item.payload.anchor !== undefined) {
        if (res.length > 0) {
          res.push({ type: 'separator' });
        }
        res.push({
          title: this.$t('asset.copyLink'),
          icon: 'link',
          action: async () => {
            try {
              const projectInfo = this.$getAppManager()
                .get(ProjectManager)
                .getProjectInfo();
              let link = '';
              if (projectInfo && this.assetId) {
                link = getProjectLinkHref(
                  this.$router,
                  projectInfo,
                  {
                    name: 'project-asset-by-id',
                    params: {
                      assetId: this.assetId,
                    },
                  },
                  true,
                );
              }
              await clipboardCopyPlainText(
                link +
                  '#' +
                  makeAnchorTagId(item.payload.blockId, item.payload.anchor),
              );
              this.$getAppManager()
                .get(UiManager)
                .showSuccess(this.$t('asset.linkCopied'));
            } catch (e) {
              console.error(e);
              this.$getAppManager().get(UiManager).showError(e);
            }
          },
        });
      }
      return res;
    },
    getContextMenu(
      item: TreePresenterItem<BlockContentItem<any>>,
    ): ExtendedMenuListItem[] {
      if (!this.showMenu) {
        return [];
      }
      if (this.selection.length === 1 || !this.selection.includes(item.id)) {
        return this.getMenu(item);
      }
      const selected_items = this.treePresenterVM.findItemsByIds(
        this.selection,
      );
      if (selected_items.length === 0) {
        return [];
      }
      return this.editorContext.getContentItemsMenu(
        item.payload.blockId,
        selected_items
          .filter((it) => it.payload.blockId === item.payload.blockId)
          .map((it) => it.payload),
      );
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetContentTreePresenter-node:deep(
    .BlockWithMenu-menu-additional .is-button
  ) {
  --button-padding: 0.23em 0.07em;
}
.AssetContentTreePresenter-node-icon {
  margin-right: 3px;
}
.AssetContentTreePresenter-node-content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
</style>
