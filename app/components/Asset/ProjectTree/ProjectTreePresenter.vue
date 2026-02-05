<template>
  <tree-presenter
    ref="treePresenter"
    v-model:selection="treePresenterSelection"
    class="ProjectTreePresenter"
    :tree-presenter-vm="treePresenterVM"
    :selection-mode="selectionMode"
    :get-node-class="getNodeClass"
    @item:click="$emit('item:click', $event)"
    @item:dblclick="$emit('item:dblclick', $event)"
    @item:expand="$emit('item:expand', $event)"
    @item:collapse="$emit('item:collapse', $event)"
    @item:focus="$emit('item:focus', $event)"
  >
    <template #node="{ item }">
      <project-tree-presenter-workspace
        v-if="item.payload.type === 'workspace'"
        :item="item"
        :get-workspace-menu="getWorkspaceMenu"
        :show-project-items-path-in-tooltip="
          !treePresenterVM.options.showWorkspaceTree ||
          treePresenterVM.options.hideNonAlternativeWorkspaces
        "
      >
        <template #workspacePrepend="slotProps"
          ><slot name="workspacePrepend" v-bind="slotProps"></slot
        ></template>
        <template #workspaceAppend="slotProps"
          ><slot name="workspaceAppend" v-bind="slotProps"></slot
        ></template>

        <template #menu-item-createElement>
          <create-asset-box
            :root-workspace-id="item.payload.id"
          ></create-asset-box>
        </template>
        <template #menu-item-createFolder>
          <create-folder-box
            :root-workspace-id="item.payload.id"
          ></create-folder-box>
        </template>
      </project-tree-presenter-workspace>
      <project-tree-presenter-asset
        v-else-if="item.payload.type === 'asset'"
        :item="item"
        :get-asset-menu="getAssetMenu"
        :show-project-items-path-in-tooltip="
          !treePresenterVM.options.showWorkspaceTree ||
          treePresenterVM.options.hideNonAlternativeWorkspaces
        "
        :show-asset-content="treePresenterVM.options.showAssetContent"
        @content-revealed="onAssetContentRevealed(item)"
      >
        <template #assetPrepend="slotProps"
          ><slot name="assetPrepend" v-bind="slotProps"></slot
        ></template>
        <template #assetAppend="slotProps"
          ><slot name="assetAppend" v-bind="slotProps"></slot
        ></template>
      </project-tree-presenter-asset>
      <project-tree-presenter-additional
        v-else-if="item.payload.type === 'additional'"
        :item="item"
        :additional-options="treePresenterVM.options.additionalOptions"
      >
        <template #additionalPrepend="slotProps"
          ><slot name="additionalPrepend" v-bind="slotProps"></slot
        ></template>
        <template #additionalAppend="slotProps"
          ><slot name="additionalAppend" v-bind="slotProps"></slot
        ></template>
      </project-tree-presenter-additional>
      <project-tree-presenter-contents
        v-else-if="item.payload.type === 'contents'"
        :item="item"
      ></project-tree-presenter-contents>
    </template>
    <template #before-node="{ item }">
      <div
        v-if="item.payload.type === 'additional' && item.payload.index === 0"
        class="ProjectTreePresenter-additionalLine"
      ></div>
    </template>
    <template #empty="slotProps">
      <slot name="empty" v-bind="slotProps">
        <div class="ProjectTreePresenter-empty">
          {{
            noItemsCaption !== null ? noItemsCaption : $t('gddPage.menu.empty')
          }}
        </div>
      </slot>
    </template>
  </tree-presenter>
</template>
<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import TreePresenter from '../../Common/TreePresenter/TreePresenter.vue';
import type { AssetPropWhere } from '../../../logic/types/PropsWhere';
import {
  ProjectTreePresenterVM,
  type ProjectTreePresenterVMOptions,
} from './ProjectTreePresenterVM';
import type { ProjectTreeSelectedItem } from '../../../logic/vm/IProjectTreePresenterVM';
import type { TreePresenterItem } from '../../Common/TreePresenter/TreePresenter';
import ProjectTreePresenterAsset from './ProjectTreePresenterAsset.vue';
import ProjectTreePresenterWorkspace from './ProjectTreePresenterWorkspace.vue';
import ProjectTreePresenterAdditional from './ProjectTreePresenterAdditional.vue';
import type {
  AssetForSelection,
  AssetShort,
} from '../../../logic/types/AssetsType';
import type { ExtendedMenuListItem } from '../../../logic/types/MenuList';
import type { Workspace } from '../../../logic/types/Workspaces';
import type { ProjectTreeItemPayload } from './ProjectTreePresenterBaseVM';
import ProjectTreePresenterContents from './ProjectTreePresenterContents.vue';

export default defineComponent({
  name: 'ProjectTreePresenter',
  components: {
    TreePresenter,
    ProjectTreePresenterAsset,
    ProjectTreePresenterWorkspace,
    ProjectTreePresenterAdditional,
    ProjectTreePresenterContents,
    CreateAssetBox: defineAsyncComponent(() => import('../CreateAssetBox.vue')),
    CreateFolderBox: defineAsyncComponent(
      () => import('../CreateFolderBox.vue'),
    ),
  },
  props: {
    showAssetInheritance: {
      type: Boolean,
      default: false,
    },
    showAssetContent: {
      type: Boolean,
      default: false,
    },
    showWorkspaceTree: {
      type: Boolean,
      default: true,
    },
    hideNonAlternativeWorkspaces: {
      type: Boolean,
      default: false,
    },
    hideEmptyWorkspaces: {
      type: Boolean,
      default: false,
    },
    allowSelectWorkspaces: {
      type: Boolean,
      default: true,
    },
    selection: {
      type: Array<ProjectTreeSelectedItem>,
      default: () => [],
    },
    selectionMode: {
      type: String as PropType<'single' | 'multiple' | 'none'>,
      default: 'single',
    },
    getWorkspaceMenu: {
      type: Function as PropType<
        (workspace: Workspace) => ExtendedMenuListItem[]
      >,
      default: () => [],
    },
    getAssetMenu: {
      type: Function as PropType<(asset: AssetShort) => ExtendedMenuListItem[]>,
      default: () => [],
    },
    noItemsCaption: {
      type: [String, null],
      default: null,
    },
    allowDragChange: {
      type: Boolean,
      default: false,
    },
    additionalOptions: {
      type: Array<AssetForSelection>,
      default: () => [],
    },
    assetWhere: {
      type: Object as PropType<AssetPropWhere>,
      default: () => ({}),
    },
    externalVm: {
      type: [Object, null] as PropType<ProjectTreePresenterVM | null>,
      default: null,
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
  ],
  data() {
    return {
      treePresenterVM: this.externalVm
        ? this.externalVm
        : new ProjectTreePresenterVM(
            this.$getAppManager(),
            this._getTreePresenterOptions(),
          ),
    };
  },
  computed: {
    treePresenterOptions(): ProjectTreePresenterVMOptions {
      return this._getTreePresenterOptions();
    },
    treePresenterSelection: {
      get(): TreePresenterItem<ProjectTreeItemPayload>[] {
        return this.selection.map((sel) => {
          return {
            id: `${sel.type}:${sel.id}`,
            payload: {
              id: sel.id,
              type: sel.type,
              index: null,
            },
          };
        });
      },
      set(val: TreePresenterItem<ProjectTreeItemPayload>[]) {
        this.$emit(
          'update:selection',
          val.map((v) => {
            return {
              id: v.payload.id,
              type: v.payload.type,
              title: v.title,
            };
          }),
        );
      },
    },
  },
  watch: {
    treePresenterOptions(val: ProjectTreePresenterVMOptions) {
      if (!this.externalVm) {
        this.treePresenterVM.setOptions(val);
      }
    },
    externalVm() {
      this.treePresenterVM = this.externalVm
        ? this.externalVm
        : new ProjectTreePresenterVM(
            this.$getAppManager(),
            this._getTreePresenterOptions(),
          );
      if (!this.externalVm && this.$el) {
        this.treePresenterVM.init();
      }
    },
  },
  mounted() {
    if (!this.externalVm) {
      this.treePresenterVM.init();
    }
  },
  unmounted() {
    if (!this.externalVm) {
      this.treePresenterVM.destroy();
    }
  },
  methods: {
    getNodeClass(item: TreePresenterItem<ProjectTreeItemPayload>) {
      return `type-${item.payload.type}`;
    },
    _getTreePresenterOptions(): ProjectTreePresenterVMOptions {
      return {
        assetWhere: this.assetWhere,
        showAssetInheritance: this.showAssetInheritance,
        showWorkspaceTree: this.showWorkspaceTree,
        showAssetContent: this.showAssetContent,
        hideNonAlternativeWorkspaces: this.hideNonAlternativeWorkspaces,
        hideEmptyWorkspaces: this.hideEmptyWorkspaces,
        allowDragChange: this.allowDragChange,
        additionalOptions: this.additionalOptions,
        allowSelectWorkspaces:
          this.allowSelectWorkspaces && this.selectionMode !== 'none',
      };
    },
    expandWorkspaceIds(workspace_ids: string[]) {
      for (const workspace_id of workspace_ids) {
        this.treePresenterVM.setExpanded('workspace:' + workspace_id, true);
      }
    },
    focusItem(
      item_type: 'asset' | 'workspace' | 'additional',
      item_id: string,
    ): boolean {
      if (!this.$refs['treePresenter']) {
        return false;
      }
      return (
        this.$refs['treePresenter'] as InstanceType<typeof TreePresenter>
      ).setFocusedNodeById(`${item_type}:${item_id}`);
    },
    onAssetContentRevealed(item: TreePresenterItem<ProjectTreeItemPayload>) {
      const state = this.treePresenterVM.ensureState(item.id);
      state.expanded = true;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped></style>
<style lang="scss" rel="stylesheet/scss">
.ProjectTreePresenter-row {
  display: flex;
}
.ProjectTreePresenter-link {
  flex: 1;
  text-decoration: none;
  color: inherit;
  white-space: nowrap;
  align-items: center;
  text-overflow: ellipsis;
  overflow: hidden;
  .AssetLink-title {
    text-overflow: ellipsis;
    overflow: hidden;
  }
}
.ProjectTreePresenter-empty {
  padding-left: var(--TreePresenter-level-padding);
  color: var(--local-sub-text-color);
  font-style: italic;
}
.ProjectTreePresenter-additionalLine {
  height: 1px;
  width: 100%;
  background: var(--local-text-color);
  margin-top: 10px;
  margin-bottom: 10px;
}

.ProjectTreePresenter
  .TreePresenterNode.type-asset:not(:hover):not(.state-expanded)
  .TreePresenterNode-node-expand {
  visibility: hidden;
}
</style>
