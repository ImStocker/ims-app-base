<template>
  <div
    class="TreePresenter"
    tabindex="-1"
    :class="{
      'state-drag-over': dragOverEffect !== 'none',
    }"
    :data-drop-effect="dragOverEffect !== 'none' ? dragOverEffect : undefined"
    :data-drop-position="dragOverPosition"
    @keydown="onKeydown"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <tree-presenter-children
      ref="children"
      class="TreePresenter-children"
      :selection-mode="selectionMode"
      :selection="selection"
      :selection-info="selectionInfo"
      :tree-presenter-vm="treePresenterVm"
      :parents="[]"
      :focus-item="focusItem"
      :anchor-item="anchorItem"
      :get-node-class="getNodeClass"
      @update:selection="$emit('update:selection', $event)"
      @item:click="$emit('item:click', $event)"
      @item:dblclick="$emit('item:dblclick', $event)"
      @item:expand="$emit('item:expand', $event)"
      @item:collapse="$emit('item:collapse', $event)"
      @item:focus="onItemFocused"
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
        ><slot name="loading" v-bind="slotProps"></slot></template
      ><template #empty="slotProps"
        ><slot name="empty" v-bind="slotProps"></slot></template
    ></tree-presenter-children>
    <div class="TreePresenter-emptyRootSpace"></div>
  </div>
</template>

<script lang="ts" type="text/ecmascript-6">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import {
  extendSelectionInTreePresenter,
  type TreePresenterBaseVM,
  type TreePresenterChildrenComp,
  type TreePresenterItem,
  type TreePresenterItemEvent,
  type TreePresenterItemInTree,
  type TreePresenterNodeComp,
  type TreePresenterSelectionMode,
} from './TreePresenter';
import TreePresenterChildren from './TreePresenterChildren.vue';
import UiManager from '../../../logic/managers/UiManager';

export default defineComponent({
  name: 'TreePresenter',
  components: {
    TreePresenterChildren,
  },
  props: {
    selectionMode: {
      type: String as PropType<TreePresenterSelectionMode>,
      default: 'single',
    },
    selection: {
      type: Array<TreePresenterItem<any>>,
      default: () => [],
    },
    treePresenterVm: {
      type: Object as PropType<UnwrapRef<TreePresenterBaseVM<any>>>,
      required: true,
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
    'item:keydown',
  ],
  data() {
    return {
      anchorItem: null as TreePresenterItemInTree<any> | null,
      focusItem: null as TreePresenterItemInTree<any> | null,
      dragOverEffect: 'none' as DataTransfer['dropEffect'],
      dragOverPosition: 'after' as 'before' | 'after' | 'inside',
    };
  },
  computed: {
    selectionInfo() {
      return this.treePresenterVm.getSelectionInfo(this.selection);
    },
  },
  methods: {
    onDragOver(ev: DragEvent) {
      if (!ev.dataTransfer) return;

      if (
        ev.target &&
        this.$refs.children &&
        (this.$refs.children as TreePresenterChildrenComp).$el &&
        (this.$refs.children as TreePresenterChildrenComp).$el.contains(
          ev.target,
        )
      ) {
        return;
      }

      const drag_over = this.treePresenterVm.getDragOverEffect(
        null,
        ev.dataTransfer,
      );
      this.dragOverEffect =
        typeof drag_over === 'string' ? drag_over : drag_over.effect;
      this.dragOverPosition =
        typeof drag_over === 'string' ? 'after' : drag_over.position;
      if (this.dragOverEffect !== 'none') {
        ev.dataTransfer.dropEffect = this.dragOverEffect;
        ev.preventDefault();
      }
    },
    _dragStop() {
      this.dragOverEffect = 'none';
    },
    onDragLeave(ev: DragEvent) {
      if (
        ev.relatedTarget &&
        (!this.$el || this.$el.contains(ev.relatedTarget)) &&
        !(
          this.$refs.children &&
          (this.$refs.children as TreePresenterChildrenComp).$el &&
          (this.$refs.children as TreePresenterChildrenComp).$el.contains(
            ev.relatedTarget,
          )
        )
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
        null,
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
          await this.treePresenterVm.dragDrop(null, ev_dt);
        });
    },
    focus() {
      const root_children = this.treePresenterVm.getDisplayingChildren('');
      if (root_children.length > 0) {
        this.setFocusedNode({
          item: root_children[0],
          parents: [],
        });
      } else if (this.$el) {
        this.$el.focus();
      }
    },
    setFocusedNodeById(
      node_id: string,
      originalEvent: Event | undefined = undefined,
      set_anchor = true,
    ): boolean {
      let found_node: TreePresenterItemInTree<any> | null = null;
      for (const node of this.treePresenterVm.expandedNodes()) {
        if (node.item.id === node_id) {
          found_node = node;
        }
      }
      if (!found_node) {
        return false;
      }
      return this.setFocusedNode(found_node, originalEvent, set_anchor);
    },
    findNodeComponent(
      node: TreePresenterItemInTree<any>,
    ): TreePresenterNodeComp | undefined {
      if (!this.$refs.children) return undefined;
      return (
        this.$refs.children as TreePresenterChildrenComp
      ).findNodeComponent(node);
    },
    setFocusedNode(
      node: TreePresenterItemInTree<any>,
      originalEvent: Event | undefined = undefined,
      set_anchor = true,
    ): boolean {
      const ev: TreePresenterItemEvent<any, Event> = {
        target: node,
        defaultPrevented: false,
        originalEvent,
      };
      this.$emit('item:focus', ev);
      if (ev.defaultPrevented) return false;
      if (this.$el) {
        this.$el.focus();
      }
      this.focusItem = node;
      if (set_anchor) {
        this.anchorItem = node;
      }
      const node_comp = this.findNodeComponent(node);
      if (node_comp) {
        node_comp.scrollIntoView();
      }
      return true;
    },
    onItemFocused(ev: TreePresenterItemEvent<any, MouseEvent | KeyboardEvent>) {
      this.setFocusedNode(
        ev.target,
        ev.originalEvent,
        !ev.originalEvent || !ev.originalEvent.shiftKey,
      );
    },
    onKeydown(ev: KeyboardEvent) {
      if (!this.focusItem) return;
      const old_focus = this.focusItem;
      switch (ev.code) {
        case 'Space': {
          ev.preventDefault();
          if (
            old_focus.item.expandable &&
            (this.selectionMode === 'none' || old_focus.item.disabled)
          ) {
            const state = this.treePresenterVm.ensureState(old_focus.item.id);
            this.treePresenterVm.setExpanded(
              old_focus.item.id,
              !state.expanded,
            );
          } else if (
            this.selectionMode !== 'none' &&
            !old_focus.item.disabled
          ) {
            if (this.selectionMode === 'single' || !ev.ctrlKey) {
              this.$emit('update:selection', [old_focus.item]);
            } else {
              const new_selection = [...this.selection];
              const selected_index = new_selection.findIndex(
                (it) => it.id === old_focus.item.id,
              );
              if (selected_index >= 0) {
                new_selection.splice(selected_index, 1);
              } else {
                new_selection.push(old_focus.item);
              }
              this.$emit('update:selection', new_selection);
            }
          }
          break;
        }
        case 'ArrowDown': {
          ev.preventDefault();
          const next = this.treePresenterVm.getNextNode(this.focusItem);
          if (next) {
            this.setFocusedNode(
              next,
              ev,
              this.selectionMode === 'single' || !ev.shiftKey,
            );
            if (this.selectionMode === 'single') {
              if (!this.focusItem.item.disabled) {
                this.$emit('update:selection', [this.focusItem.item]);
              }
            } else {
              if (ev.shiftKey) {
                const new_selection = [...this.selection];
                const expanded_nodes =
                  this.treePresenterVm.expandedNodesAsArray();
                extendSelectionInTreePresenter(
                  new_selection,
                  expanded_nodes,
                  old_focus,
                  this.anchorItem,
                  this.focusItem,
                );
                this.$emit('update:selection', new_selection);
              }
            }
          }
          break;
        }
        case 'ArrowUp': {
          ev.preventDefault();
          const prev = this.treePresenterVm.getPreviousNode(this.focusItem);
          if (prev) {
            this.setFocusedNode(
              prev,
              ev,
              this.selectionMode === 'single' || !ev.shiftKey,
            );
            if (this.selectionMode === 'single') {
              if (!this.focusItem.item.disabled) {
                this.$emit('update:selection', [this.focusItem.item]);
              }
            } else {
              if (ev.shiftKey) {
                const new_selection = [...this.selection];
                const expanded_nodes =
                  this.treePresenterVm.expandedNodesAsArray();
                extendSelectionInTreePresenter(
                  new_selection,
                  expanded_nodes,
                  old_focus,
                  this.anchorItem,
                  this.focusItem,
                );
                this.$emit('update:selection', new_selection);
              }
            }
          }
          break;
        }
        case 'ArrowRight': {
          ev.preventDefault();
          const state = this.treePresenterVm.ensureState(
            this.focusItem.item.id,
          );
          if (state.expanded) {
            const next = this.treePresenterVm.getNextNode(this.focusItem);
            if (next) {
              this.setFocusedNode(next, ev, !ev.shiftKey);
            }
          } else {
            if (this.focusItem.item.expandable) {
              this.treePresenterVm.setExpanded(this.focusItem.item.id, true);
            }
          }
          break;
        }
        case 'ArrowLeft': {
          ev.preventDefault();
          const state = this.treePresenterVm.ensureState(
            this.focusItem.item.id,
          );
          if (state.expanded) {
            if (this.focusItem.item.expandable) {
              this.treePresenterVm.setExpanded(this.focusItem.item.id, false);
            }
          } else {
            if (this.focusItem.parents.length > 0) {
              this.setFocusedNode(
                {
                  item: this.focusItem.parents[
                    this.focusItem.parents.length - 1
                  ],
                  parents: this.focusItem.parents.slice(
                    0,
                    this.focusItem.parents.length - 1,
                  ),
                },
                ev,
                !ev.shiftKey,
              );
            }
          }
          break;
        }
        case 'KeyA':
          if (this.selectionMode === 'multiple' && (ev.ctrlKey || ev.metaKey)) {
            ev.preventDefault();
            const parent =
              old_focus.parents.length > 0
                ? old_focus.parents[old_focus.parents.length - 1]
                : null;
            const parent_node = parent
              ? {
                  item: parent,
                  parents: old_focus.parents.slice(
                    0,
                    old_focus.parents.length - 1,
                  ),
                }
              : null;
            const parent_children =
              this.treePresenterVm.expandedNodesGetChildrenOf(parent_node);
            this.$emit(
              'update:selection',
              parent_children.map((p) => p.item),
            );
            if (parent_node) {
              this.setFocusedNode(parent_node, ev, false);
            }
          }
          break;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.TreePresenter-children {
  position: relative;
}
.TreePresenter:focus {
  outline: none;
  user-select: none;
}
.TreePresenter.state-drag-over {
  .TreePresenter-children {
    &:before {
      content: '';
      display: block;
      width: 100%;
      height: 2px;
      background: var(--local-text-color);
      position: absolute;
      left: 0;
      bottom: 0;
      z-index: 10;
    }
  }
}
.TreePresenter-emptyRootSpace {
  height: 2px;
}
</style>
