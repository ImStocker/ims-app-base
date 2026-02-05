<template>
  <div class="TreePresenterChildren">
    <slot v-if="!!state.loadingTask" name="loading" :item="item">
      <div class="TreePresenterChildren-loading">
        <div class="TreePresenterChildren-loading-spinner loaderSpinner"></div>
        <div class="TreePresenterChildren-loading-label">
          {{ $t('common.loading') }}
        </div>
      </div>
    </slot>
    <slot
      v-else-if="state.loadingError"
      name="error"
      :message="state.loadingError"
    >
      <div class="TreePresenterChildren-error">
        {{ state.loadingError }}
      </div>
    </slot>
    <div
      v-else-if="displayingChildren.length === 0"
      ref="empty"
      class="TreePresenterChildren-empty"
      :class="{
        'state-drag-over': dragOverEffect !== 'none',
      }"
      :data-drop-effect="dragOverEffect !== 'none' ? dragOverEffect : undefined"
      :data-drop-position="
        dragOverEffect !== 'none' ? dragOverPosition : undefined
      "
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <slot name="empty" :level="parents.length"></slot>
    </div>
    <div v-else class="TreePresenterChildren-content">
      <div v-for="child of displayingChildren" :key="child.id">
        <slot name="before-node" :item="child"></slot>
        <tree-presenter-node
          ref="nodes"
          :item="child"
          :selection-mode="selectionMode"
          :selection="selection"
          :selection-info="selectionInfo"
          :tree-presenter-vm="treePresenterVm"
          :parents="parents"
          :focus-item="focusItem"
          :anchor-item="anchorItem"
          :get-node-class="getNodeClass"
          @update:selection="$emit('update:selection', $event)"
          @item:click="$emit('item:click', $event)"
          @item:dblclick="$emit('item:dblclick', $event)"
          @item:expand="$emit('item:expand', $event)"
          @item:collapse="$emit('item:collapse', $event)"
          @item:focus="$emit('item:focus', $event)"
        >
          <template #node="slotProps"
            ><slot name="node" v-bind="slotProps"></slot
          ></template>
          <template #before-node="slotProps"
            ><slot name="before-node" v-bind="slotProps"></slot
          ></template>
          <template #after-node="slotProps"
            ><slot name="after-node" v-bind="slotProps"></slot
          ></template>
          <template #expand-button="slotProps"
            ><slot name="expand-button" v-bind="slotProps"></slot
          ></template>
          <template #error="slotProps"
            ><slot name="error" v-bind="slotProps"></slot
          ></template>
          <template #loading="slotProps"
            ><slot name="loading" v-bind="slotProps"></slot
          ></template>
          <template #empty="slotProps"
            ><slot name="empty" v-bind="slotProps"></slot></template
        ></tree-presenter-node>
        <slot name="after-node" :item="child"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" type="text/ecmascript-6">
import {
  defineAsyncComponent,
  defineComponent,
  type PropType,
  type UnwrapRef,
} from 'vue';
import {
  TREE_PRESENTER_ROOT_STATE_ID,
  type TreePresenterBaseVM,
  type TreePresenterItem,
  type TreePresenterItemInTree,
  type TreePresenterNodeComp,
  type TreePresenterSelectionInfo,
  type TreePresenterSelectionMode,
} from './TreePresenter';
import UiManager from '../../../logic/managers/UiManager';

export default defineComponent({
  name: 'TreePresenterChildren',
  components: {
    TreePresenterNode: defineAsyncComponent(
      () => import('./TreePresenterNode.vue'),
    ),
  },
  props: {
    item: {
      type: [Object, null] as PropType<TreePresenterItem<any> | null>,
      default: null,
    },
    selectionMode: {
      type: String as PropType<TreePresenterSelectionMode>,
      default: 'single',
    },
    selection: {
      type: Array<TreePresenterItem<any>>,
      default: () => [],
    },
    selectionInfo: {
      type: Object as PropType<TreePresenterSelectionInfo<any>>,
      required: true,
    },
    parents: {
      type: Array<TreePresenterItem<any>>,
      required: true,
    },
    treePresenterVm: {
      type: Object as PropType<UnwrapRef<TreePresenterBaseVM<any>>>,
      required: true,
    },
    focusItem: {
      type: [Object, null] as PropType<TreePresenterItemInTree<any> | null>,
      default: null,
    },
    anchorItem: {
      type: [Object, null] as PropType<TreePresenterItemInTree<any> | null>,
      default: null,
    },
    getNodeClass: {
      type: [Function, null] as PropType<
        | ((
            item: TreePresenterItem<any>,
          ) => string | string | Record<string, boolean>)
        | null
      >,
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
  ],
  data() {
    return {
      dragOverEffect: 'none' as DataTransfer['dropEffect'],
      dragOverPosition: 'before' as 'before' | 'after' | 'inside',
    };
  },
  computed: {
    state() {
      return this.treePresenterVm.ensureState(
        this.item ? this.item.id : TREE_PRESENTER_ROOT_STATE_ID,
      );
    },
    needLoadChildren() {
      return (
        (!this.item || (this.item && this.item.expandable)) &&
        !this.state.loaded &&
        !this.state.loadingTask
      );
    },
    displayingChildren() {
      return this.treePresenterVm.getDisplayingChildren(
        this.item ? this.item.id : TREE_PRESENTER_ROOT_STATE_ID,
      );
    },
    itemNode() {
      return this.item
        ? {
            item: this.item,
            parents: this.parents,
          }
        : null;
    },
  },
  watch: {
    needLoadChildren(val) {
      if (val) {
        this.reload();
      }
    },
  },
  async mounted() {
    if (this.needLoadChildren) {
      await this.reload();
    }
  },
  methods: {
    findNodeComponent(
      node: TreePresenterItemInTree<any>,
    ): TreePresenterNodeComp | undefined {
      if (!this.$refs.nodes) return undefined;
      for (const node_comp of this.$refs.nodes as TreePresenterNodeComp[]) {
        const res = node_comp.findNodeComponent(node);
        if (res) return res;
      }
      return undefined;
    },
    async reload() {
      await this.treePresenterVm.requestChildren(this.item);
    },
    onDragOver(ev: DragEvent) {
      if (!ev.dataTransfer) return;
      const drag_over = this.treePresenterVm.getDragOverEffect(
        this.itemNode,
        ev.dataTransfer,
        true,
      );
      this.dragOverEffect =
        typeof drag_over === 'string' ? drag_over : drag_over.effect;
      this.dragOverPosition =
        typeof drag_over === 'string' ? 'before' : drag_over.position;
      if (this.dragOverEffect !== 'none') {
        ev.dataTransfer.dropEffect = this.dragOverEffect;
        ev.preventDefault();
      }
    },
    _dragStop() {
      this.dragOverEffect = 'none';
      this.dragOverPosition = 'before';
    },
    onDragLeave(ev: DragEvent) {
      if (
        ev.relatedTarget &&
        (!this.$refs.empty ||
          (this.$refs.empty as HTMLElement).contains(
            ev.relatedTarget as HTMLElement,
          ))
      ) {
        return;
      }
      this._dragStop();
    },
    async onDrop(ev: DragEvent) {
      this._dragStop();
      const ev_dt = ev.dataTransfer;
      if (!ev_dt) return;

      const drag_over = this.treePresenterVm.getDragOverEffect(
        this.itemNode,
        ev.dataTransfer,
      );
      if (
        drag_over === 'none' ||
        (typeof drag_over === 'object' && drag_over.effect === 'none')
      ) {
        return;
      }

      ev.preventDefault();
      ev.stopPropagation();
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.treePresenterVm.dragDrop(this.itemNode, ev_dt, true);
        });
    },
  },
});
</script>

<style lang="scss" scoped>
.TreePresenterChildren {
  --TreePresenter-level-padding: calc(
    (var(--TreePresenter-level, -1) + 1) *
      var(--TreePresenter-children-padding, 14px) +
      var(--TreePresenter-left-padding, 0px)
  );
}
.TreePresenterChildren-loading {
  display: flex;
  align-items: center;
  gap: 5px;
}
.TreePresenterChildren-loading {
  font-style: italic;
  color: var(--local-sub-text-color);
}
.TreePresenterChildren-error {
  color: var(--color-main-error);
}
.TreePresenterChildren-loading {
  padding-left: calc(
    var(--TreePresenter-level-padding) +
      var(--TreePresenter-loading-padding, 0px)
  );
}
.TreePresenterChildren-error {
  padding-left: calc(
    var(--TreePresenter-level-padding) + var(--TreePresenter-error-padding, 0px)
  );
}
.TreePresenterChildren-empty {
  position: relative;
}
.TreePresenterChildren-empty.state-drag-over {
  &:before {
    content: '';
    display: block;
    width: 2px;
    height: 2px;
    background: var(--local-text-color);
    position: absolute;
    left: 0;
    z-index: 10;
  }
  &[data-drop-position='inside'] {
    &::before {
      top: 0;
      height: 100%;
    }
  }
  &[data-drop-position='before'] {
    &::before {
      top: 0;
      width: 100%;
    }
  }
  &[data-drop-position='after'] {
    &::before {
      bottom: 0;
      width: 100%;
    }
  }
}
</style>
