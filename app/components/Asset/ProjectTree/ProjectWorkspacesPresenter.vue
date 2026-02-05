<template>
  <tree-presenter
    v-model:selection="treePresenterSelection"
    class="ProjectWorkspacesPresenter"
    :tree-presenter-vm="treePresenterVM"
    :selection-mode="selectionMode"
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
        show-icon="always"
        :show-project-items-path-in-tooltip="true"
      >
        <template #workspacePrepend="slotProps"
          ><slot name="workspacePrepend" v-bind="slotProps"></slot
        ></template>
        <template #workspaceAppend="slotProps"
          ><slot name="workspaceAppend" v-bind="slotProps"></slot
        ></template>
      </project-tree-presenter-workspace>
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
    </template>
    <template #before-node="{ item }">
      <div
        v-if="item.payload.type === 'additional' && item.payload.index === 0"
        class="ProjectTreePresenter-additionalLine"
      ></div>
    </template>
    <template #empty>
      <div class="ProjectTreePresenter-empty">
        {{
          noItemsCaption !== null ? noItemsCaption : $t('gddPage.menu.empty')
        }}
      </div>
    </template>
  </tree-presenter>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import TreePresenter from '../../Common/TreePresenter/TreePresenter.vue';
import ProjectTreePresenterWorkspace from './ProjectTreePresenterWorkspace.vue';
import type { AssetForSelection } from '../../../logic/types/AssetsType';
import type { ExtendedMenuListItem } from '../../../logic/types/MenuList';
import type {
  Workspace,
  WorkspaceQueryDTOWhere,
} from '../../../logic/types/Workspaces';
import type { ProjectTreeSelectedItem } from '../../../logic/vm/IProjectTreePresenterVM';
import type { TreePresenterItem } from '../../Common/TreePresenter/TreePresenter';
import type { ProjectTreeItemPayload } from './ProjectTreePresenterBaseVM';
import {
  ProjectWorkspacesPresenterVM,
  type ProjectWorkspacesPresenterVMOptions,
} from './ProjectWorkspacesPresenterVM';

export default defineComponent({
  name: 'ProjectWorkspacesPresenter',
  components: {
    TreePresenter,
    ProjectTreePresenterWorkspace,
  },
  props: {
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
    noItemsCaption: {
      type: [null, String],
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
    workspaceWhere: {
      type: Object as PropType<WorkspaceQueryDTOWhere>,
      default: () => ({}),
    },
    externalVm: {
      type: [Object, null] as PropType<ProjectWorkspacesPresenterVM | null>,
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
        : new ProjectWorkspacesPresenterVM(
            this.$getAppManager(),
            this._getTreePresenterOptions(),
          ),
    };
  },
  computed: {
    treePresenterOptions(): ProjectWorkspacesPresenterVMOptions {
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
    treePresenterOptions(val: ProjectWorkspacesPresenterVMOptions) {
      if (!this.externalVm) {
        this.treePresenterVM.setOptions(val);
      }
    },
    externalVm() {
      this.treePresenterVM = this.externalVm
        ? this.externalVm
        : new ProjectWorkspacesPresenterVM(
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
    _getTreePresenterOptions(): ProjectWorkspacesPresenterVMOptions {
      return {
        workspaceWhere: this.workspaceWhere,
        allowDragChange: this.allowDragChange,
        additionalOptions: this.additionalOptions,
      };
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped></style>
