<template>
  <div
    class="TreePresenterNode"
    :style="{
      '--TreePresenter-level': parents.length,
    }"
    :class="nodeClassComp"
    :data-drop-effect="dragOverEffect !== 'none' ? dragOverEffect : undefined"
    :data-drop-position="
      dragOverEffect !== 'none' ? dragOverPosition : undefined
    "
  >
    <div
      ref="node"
      class="TreePresenterNode-node"
      :class="{
        'state-selected': isSelectedParams.selected,
        'state-selected-frame-start': isSelectedParams.frameStart,
        'state-selected-frame-end': isSelectedParams.frameEnd,
        'state-focused': isFocused,
        'state-selectable': !item.disabled || item.expandable,
      }"
      :draggable="isDraggable"
      @click="onClicked"
      @dblclick="onDoubleClicked"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @dragend="onDragEnd"
    >
      <div class="TreePresenterNode-node-inner">
        <div
          v-if="item.expandable"
          ref="expand"
          class="TreePresenterNode-node-expand"
        >
          <slot
            name="expand-button"
            :item="item"
            :expanded="state.expanded"
            :toggle-expand="toggleExpand"
          >
            <button
              class="TreePresenterNode-node-expand-button"
              @click="toggleExpand"
            >
              <i
                class="TreePresenterNode-node-expand-icon"
                :class="{
                  'ri-arrow-down-s-fill': state.expanded,
                  'ri-arrow-right-s-fill': !state.expanded,
                }"
              ></i>
            </button>
          </slot>
        </div>
        <div class="TreePresenterNode-node-content">
          <slot name="node" :item="item" :expanded="state.expanded">
            {{ item.title ?? '' }}
          </slot>
        </div>
      </div>
    </div>
    <div v-if="state.expanded" class="TreePresenterNode-expanded">
      <tree-presenter-children
        ref="children"
        :tree-presenter-vm="treePresenterVm"
        :selection-mode="selectionMode"
        :selection="selection"
        :selection-info="selectionInfo"
        :item="item"
        :parents="[...parents, item]"
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
      ></tree-presenter-children>
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
  extendSelectionInTreePresenter,
  sameTreePresenterNodes,
  type TreePresenterBaseVM,
  type TreePresenterChildrenComp,
  type TreePresenterItem,
  type TreePresenterItemEvent,
  type TreePresenterItemInTree,
  type TreePresenterNodeComp,
  type TreePresenterSelectionInfo,
  type TreePresenterSelectionMode,
} from './TreePresenter';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import UiManager from '../../../logic/managers/UiManager';

export default defineComponent({
  name: 'TreePresenterNode',
  components: {
    TreePresenterChildren: defineAsyncComponent(
      () => import('./TreePresenterChildren.vue') as any,
    ),
  },
  props: {
    item: {
      type: Object as PropType<TreePresenterItem<any>>,
      required: true,
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
      dragOverTimer: null as NodeJS.Timeout | null,
      dragOverEffect: 'none' as DataTransfer['dropEffect'],
      dragOverPosition: 'before' as 'before' | 'after' | 'inside',
      dragStartContext: null as null | {
        canvas: HTMLCanvasElement | null;
        items: TreePresenterItemInTree<any>[];
      },
    };
  },
  computed: {
    state() {
      return this.treePresenterVm.ensureState(this.item.id);
    },
    isSelectedParams(): {
      selected: boolean;
      frameStart: boolean;
      frameEnd: boolean;
    } {
      const res = {
        selected: this.selectionInfo.selectedIds.has(this.item.id),
        frameStart: false,
        frameEnd: false,
      };
      if (res.selected) {
        res.frameStart = this.selectionInfo.frameStarts.some((n) =>
          sameTreePresenterNodes(n, this.itemNode),
        );
        res.frameEnd = this.selectionInfo.frameEnds.some((n) =>
          sameTreePresenterNodes(n, this.itemNode),
        );
      }
      return res;
    },
    itemNode() {
      return {
        item: this.item,
        parents: this.parents,
      };
    },
    isFocused() {
      if (!this.focusItem) return false;
      return sameTreePresenterNodes(this.focusItem, this.itemNode);
    },
    isDraggable() {
      if (this.item.draggable) return true;
      if (this.isSelectedParams.selected) {
        return this.selection.some((it) => it.draggable);
      }
      return false;
    },
    nodeClassComp() {
      const res: Record<string, boolean> = {};
      if (this.getNodeClass) {
        const add_class = this.getNodeClass(this.item);
        if (typeof add_class === 'string') {
          res[add_class] = true;
        } else if (Array.isArray(add_class)) {
          for (const ac of add_class) {
            res[ac] = true;
          }
        } else {
          Object.assign(res, add_class);
        }
      }
      res['state-expandable'] = !!this.item.expandable;
      res['state-expanded'] = this.state.expanded;
      res['state-drag-over'] = this.dragOverEffect !== 'none';
      return res;
    },
  },
  methods: {
    onDragStart(ev: DragEvent) {
      if (!this.isDraggable) return;
      const dragging_items = this.isSelectedParams.selected
        ? this.selectionInfo.selectedNodes.filter((n) => n.item.draggable)
        : [this.itemNode];
      const data = this.treePresenterVm.dragStart(dragging_items);
      if (!data || !ev.dataTransfer) {
        ev.preventDefault();
        return;
      }

      this.dragStartContext = {
        canvas: null,
        items: dragging_items,
      };
      if (dragging_items.length > 1 || !this.item.draggable) {
        const dragging_canvas = document.createElement('canvas');
        dragging_canvas.style.position = 'absolute';
        dragging_canvas.style.left = '-100%';
        dragging_canvas.style.top = '-100%';
        dragging_canvas.width = 24;
        dragging_canvas.height = 24;
        document.body.append(dragging_canvas);
        const context = dragging_canvas.getContext('2d');
        if (context) {
          const centerX = dragging_canvas.width / 2;
          const centerY = dragging_canvas.height / 2;
          const radius = dragging_canvas.width / 2 - 2;

          const bodyStyle = getComputedStyle(document.body);

          context.beginPath();
          context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
          context.fillStyle = bodyStyle.backgroundColor;
          context.fill();
          context.lineWidth = 1;
          context.strokeStyle = bodyStyle.color;
          context.stroke();

          context.fillStyle = bodyStyle.color;
          context.font = '12px ' + bodyStyle.fontFamily;
          context.textBaseline = 'middle';
          context.textAlign = 'center';
          context.fillText(
            dragging_items.length.toString(),
            dragging_canvas.width / 2,
            dragging_canvas.height / 2,
          );

          ev.dataTransfer.setDragImage(dragging_canvas, -10, -10);
        }
        this.dragStartContext.canvas = dragging_canvas;
      }
      ev.dataTransfer.setData(data.format, JSON.stringify(data.data));
    },
    onDragOver(ev: DragEvent) {
      if (!ev.dataTransfer) return;
      if (this.item.expandable && !this.dragOverTimer) {
        this.dragOverTimer = setTimeout(() => {
          this.treePresenterVm.setExpanded(this.item.id, true);
        }, 1000);
      }

      const drag_over = this.treePresenterVm.getDragOverEffect(
        this.itemNode,
        ev.dataTransfer,
      );
      this.dragOverEffect =
        typeof drag_over === 'string' ? drag_over : drag_over.effect;
      this.dragOverPosition =
        typeof drag_over === 'string'
          ? this.item.expandable
            ? 'inside'
            : 'before'
          : drag_over.position;
      if (this.dragOverEffect !== 'none') {
        ev.dataTransfer.dropEffect = this.dragOverEffect;
        ev.preventDefault();
      }
    },
    _dragStop() {
      if (this.dragOverTimer) {
        clearTimeout(this.dragOverTimer);
        this.dragOverTimer = null;
      }
      this.dragOverEffect = 'none';
      this.dragOverPosition = 'before';
    },
    onDragLeave(ev: DragEvent) {
      if (
        ev.relatedTarget &&
        (!this.$refs.node ||
          (this.$refs.node as HTMLElement).contains(
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
          await this.treePresenterVm.dragDrop(this.itemNode, ev_dt);
        });
    },
    onDragEnd() {
      if (!this.dragStartContext) {
        return;
      }
      if (this.dragStartContext.canvas) {
        this.dragStartContext.canvas.remove();
      }
      this.treePresenterVm.dragEnd(this.dragStartContext.items);
      this.dragStartContext = null;
    },
    toggleExpand(ev: MouseEvent | undefined = undefined) {
      if (ev && (ev.shiftKey || ev.ctrlKey || ev.metaKey)) {
        return;
      }
      const e: TreePresenterItemEvent<any, MouseEvent> = {
        target: {
          item: this.item,
          parents: this.parents,
        },
        defaultPrevented: false,
        originalEvent: ev,
      };
      this.$emit(this.state.expanded ? 'item:collapse' : 'item:expand', e);
      if (e.defaultPrevented) return;
      this.treePresenterVm.setExpanded(this.item.id, !this.state.expanded);
    },
    scrollIntoView() {
      if (this.$refs.node) {
        scrollIntoViewIfNeeded(this.$refs.node as HTMLElement, {
          scrollMode: 'if-needed',
        });
      }
    },
    findNodeComponent(
      node: TreePresenterItemInTree<any>,
    ): TreePresenterNodeComp | undefined {
      if (sameTreePresenterNodes(node, this.itemNode)) {
        return this as TreePresenterNodeComp;
      }
      if (!this.$refs.children) return undefined;
      return (
        this.$refs.children as TreePresenterChildrenComp
      ).findNodeComponent(node);
    },
    onClicked(ev: MouseEvent) {
      if (
        this.$refs.expand &&
        ev.target &&
        (this.$refs.expand as HTMLElement).contains(ev.target as HTMLElement) &&
        !ev.shiftKey &&
        !ev.ctrlKey &&
        !ev.metaKey
      ) {
        return;
      }

      const e: TreePresenterItemEvent<any, MouseEvent> = {
        target: {
          item: this.item,
          parents: this.parents,
        },
        defaultPrevented: false,
        originalEvent: ev,
      };
      this.$emit('item:click', e);
      if (e.defaultPrevented) return;

      if (this.item.disabled) {
        if (this.item.expandable) {
          this.toggleExpand(ev);
        }
        return;
      }

      const old_focus = this.focusItem;
      this.$emit('item:focus', e);

      ev.preventDefault();
      if (this.selectionMode === 'none') return;
      if (
        this.selectionMode === 'single' ||
        (!ev.shiftKey && !ev.ctrlKey && !ev.metaKey)
      ) {
        if (this.isSelectedParams.selected && this.selection.length === 1) {
          return;
        }
        if (!this.item.disabled) {
          this.$emit('update:selection', [this.item]);
        }
      } else {
        const new_selection = [...this.selection];
        const selected_index = new_selection.findIndex(
          (it) => it.id === this.item.id,
        );
        if (ev.ctrlKey || ev.metaKey || !this.anchorItem) {
          if (selected_index >= 0) {
            new_selection.splice(selected_index, 1);
          } else {
            if (!this.item.disabled) {
              new_selection.push(this.item);
            }
          }
        } else {
          const expanded_nodes = this.treePresenterVm.expandedNodesAsArray();
          extendSelectionInTreePresenter(
            new_selection,
            expanded_nodes,
            old_focus,
            this.anchorItem,
            this.itemNode,
          );
        }
        this.$emit('update:selection', new_selection);
      }
    },
    onDoubleClicked(ev: MouseEvent) {
      const e: TreePresenterItemEvent<any, MouseEvent> = {
        target: {
          item: this.item,
          parents: this.parents,
        },
        defaultPrevented: false,
        originalEvent: ev,
      };
      this.$emit('item:dblclick', e);
    },
  },
});
</script>

<style lang="scss" scoped>
.TreePresenterNode {
  position: relative;
  --TreePresenter-level-padding: calc(
    var(--TreePresenter-level, 0) *
      var(--TreePresenter-children-padding, 14px) +
      var(--TreePresenter-left-padding, 0px)
  );
}
.TreePresenterNode-node-inner {
  display: flex;
  gap: var(--TreePresenter-arrow-gap, 4px);
}
.TreePresenterNode-node {
  padding-left: var(--TreePresenter-level-padding);
  border: 1px solid transparent;

  &.state-selected-frame-start {
    border-top-left-radius: var(
      --TreePresenter-border-radius,
      var(--panel-border-radius)
    );
    border-top-right-radius: var(
      --TreePresenter-border-radius,
      var(--panel-border-radius)
    );
  }
  &.state-selected-frame-end {
    border-bottom-left-radius: var(
      --TreePresenter-border-radius,
      var(--panel-border-radius)
    );
    border-bottom-right-radius: var(
      --TreePresenter-border-radius,
      var(--panel-border-radius)
    );
  }
  &.state-selectable {
    cursor: pointer;
  }
  &.state-selectable:not(.state-selected):hover {
    background: var(--TreePresenter-hl-bg-color, var(--local-hl-bg-color));
    border-radius: var(
      --TreePresenter-border-radius,
      var(--panel-border-radius)
    );
    --local-bg-color: var(
      --TreePresenter-hl-bg-color,
      var(--local-hl-bg-color)
    );
  }
  &.state-selected {
    background: var(
      --TreePresenter-selected-bg-color,
      var(--app-menu-selected-bg-color)
    );
    color: var(
      --TreePresenter-selected-text-color,
      var(--app-menu-selected-text-color)
    );
    --local-bg-color: var(
      --TreePresenter-selected-bg-color,
      var(--app-menu-selected-bg-color)
    );
  }
  &.state-focused {
    border-color: var(
      --TreePresenter-focus-outline-color,
      var(--app-menu-focus-outline-color)
    );
    &:not(.state-selected) {
      border-radius: var(
        --TreePresenter-border-radius,
        var(--panel-border-radius)
      );
    }
  }
}

.TreePresenterNode-node-content {
  flex: 1;
  min-width: 0;
}

.TreePresenterNode-node-expand-button {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--local-text-color);
}
.TreePresenterNode-node-expand-icon {
  width: 10px;
  display: block;
  position: relative;
  left: -3px;
}

.TreePresenterNode.state-drag-over {
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
