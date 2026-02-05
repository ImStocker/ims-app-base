import { assert } from '../../../logic/utils/typeUtils';
import type TreePresenterChildren from './TreePresenterChildren.vue';
import type TreePresenterNode from './TreePresenterNode.vue';

export type TreePresenterNodeComp = InstanceType<typeof TreePresenterNode>;
export type TreePresenterChildrenComp = InstanceType<
  typeof TreePresenterChildren
>;

export type TreePresenterSelectionMode = 'single' | 'multiple' | 'none';

export type TreePresenterItemInTree<T> = {
  item: TreePresenterItem<T>;
  parents: TreePresenterItem<T>[];
};

export type TreePresenterItemEvent<T, E extends Event = Event> = {
  target: TreePresenterItemInTree<T>;
  defaultPrevented: boolean;
  originalEvent?: E;
};

export type TreePresenterItem<T> = {
  id: string;
  title?: string;
  expandable?: boolean;
  draggable?: boolean;
  disabled?: boolean;
  payload: T;
};

export type TreePresenterNodeState<T> = {
  id: string;
  expanded: boolean;
  loaded: boolean;
  children: TreePresenterItem<T>[];
  loadingTask: Promise<TreePresenterItem<T>[]> | null;
  loadingError: string | null;
};

export type TreePresenterSelectionInfo<T> = {
  selectedIds: Set<string>;
  selectedNodes: TreePresenterItemInTree<T>[];
  frameStarts: TreePresenterItemInTree<T>[];
  frameEnds: TreePresenterItemInTree<T>[];
};

export type TreePresenterDragOverResult =
  | DataTransfer['dropEffect']
  | {
      effect: DataTransfer['dropEffect'];
      position: 'inside' | 'before' | 'after';
    };

export function sameTreePresenterNodes<T>(
  node1: TreePresenterItemInTree<T>,
  node2: TreePresenterItemInTree<T>,
) {
  if (node1.item.id !== node2.item.id) return false;
  if (node1.parents.length !== node2.parents.length) return false;
  for (let i = 0; i < node2.parents.length; i++) {
    if (node1.parents[i].id !== node2.parents[i].id) {
      return false;
    }
  }
  return true;
}

export function extendSelectionInTreePresenter<T>(
  selection: TreePresenterItem<T>[],
  expanded_nodes: TreePresenterItemInTree<T>[],
  focus_node: TreePresenterItemInTree<T> | null,
  anchor_node: TreePresenterItemInTree<T> | null,
  this_node: TreePresenterItemInTree<T>,
) {
  const anchor_index = anchor_node
    ? expanded_nodes.findIndex((n) => {
        return sameTreePresenterNodes(n, anchor_node);
      })
    : -1;
  const old_focus_index = focus_node
    ? expanded_nodes.findIndex((n) => {
        return sameTreePresenterNodes(n, focus_node);
      })
    : -1;
  const this_index = expanded_nodes.findIndex((n) => {
    return sameTreePresenterNodes(n, this_node);
  });
  if (old_focus_index >= 0 && old_focus_index !== anchor_index) {
    for (
      let i = Math.min(old_focus_index, anchor_index);
      i <= Math.max(old_focus_index, anchor_index);
      i++
    ) {
      const expanded_node = expanded_nodes[i];
      const expanded_node_selected_index = selection.findIndex(
        (it) => it.id === expanded_node.item.id,
      );
      if (expanded_node_selected_index >= 0) {
        selection.splice(expanded_node_selected_index, 1);
      }
    }
  }
  for (
    let i = Math.min(this_index, anchor_index);
    i <= Math.max(this_index, anchor_index);
    i++
  ) {
    const expanded_node = expanded_nodes[i];
    const expanded_node_selected_index = selection.findIndex(
      (it) => it.id === expanded_node.item.id,
    );
    if (expanded_node_selected_index < 0 && !expanded_node.item.disabled) {
      selection.push(expanded_node.item);
    }
  }
}

export const TREE_PRESENTER_ROOT_STATE_ID = '';

export abstract class TreePresenterBaseVM<T = undefined> {
  protected nodeStates = new Map<string, TreePresenterNodeState<T>>();

  public getState(id: string): TreePresenterNodeState<T> | undefined {
    return this.nodeStates.get(id);
  }

  public forgetState(id: string, recursive = true) {
    const state = this.getState(id);
    if (!state) return;
    this.nodeStates.delete(id);
    if (recursive) {
      for (const item of state.children) {
        this.forgetState(item.id);
      }
    }
  }

  public forgetChildren(id: string, recursive = true) {
    const state = this.getState(id);
    if (!state) return;
    const old_children = state.children;
    state.children = [];
    state.loaded = false;
    state.loadingTask = null;
    if (recursive) {
      for (const item of old_children) {
        this.forgetState(item.id);
      }
    }
  }

  protected deleteItemInState(item_id: string) {
    this.forgetState(item_id);
    for (const state of this.nodeStates.values()) {
      const ind = state.children.findIndex((c) => c.id === item_id);
      if (ind >= 0) state.children.splice(ind, 1);
    }
  }

  protected findOwnerState(
    item_id: string,
  ): { state: TreePresenterNodeState<T>; index: number } | null {
    for (const state of this.nodeStates.values()) {
      const index = state.children.findIndex((c) => c.id === item_id);
      if (index >= 0) {
        return {
          state,
          index,
        };
      }
    }
    return null;
  }

  protected getVisibleOwnerStatesChain(
    item_id: string,
  ): { state: TreePresenterNodeState<T>; index: number }[] {
    const owner_state = this.findOwnerState(item_id);
    if (!owner_state) return [];
    if (owner_state.state.id === TREE_PRESENTER_ROOT_STATE_ID) {
      return [owner_state];
    }
    const visible_of_owner = this.getVisibleOwnerStatesChain(
      owner_state.state.id,
    );
    if (visible_of_owner.length === 0) return [];
    if (
      visible_of_owner[visible_of_owner.length - 1].state.children[
        visible_of_owner[visible_of_owner.length - 1].index
      ].id === owner_state.state.id
    ) {
      if (owner_state.state.expanded) return [...visible_of_owner, owner_state];
    }
    return visible_of_owner;
  }

  public ensureState(id: string): TreePresenterNodeState<T> {
    const exists = this.nodeStates.get(id);
    if (exists) return exists;
    const state: TreePresenterNodeState<T> = {
      id,
      expanded: id === TREE_PRESENTER_ROOT_STATE_ID,
      children: [],
      loaded: false,
      loadingTask: null,
      loadingError: null,
    };
    this.nodeStates.set(id, state);
    const reactive_state = this.nodeStates.get(id);
    assert(reactive_state);
    return reactive_state;
  }

  public setExpanded(id: string, val: boolean) {
    const state = this.ensureState(id);
    state.expanded = val;
  }

  public dragStart(
    _nodes: TreePresenterItemInTree<T>[],
  ): { format: string; data: any } | null {
    return null;
  }

  public getDragOverEffect(
    _targetNode: TreePresenterItemInTree<T> | null,
    _dt: DataTransfer,
    _inside = false,
  ): TreePresenterDragOverResult {
    return 'none';
  }

  public async dragDrop(
    _targetNode: TreePresenterItemInTree<T> | null,
    _dt: DataTransfer,
    _inside = false,
  ): Promise<void> {}

  public dragEnd(_nodes: TreePresenterItemInTree<T>[]): void {}

  protected abstract loadChildrenImpl(
    item: TreePresenterItem<T> | null,
  ): Promise<TreePresenterItem<T>[]>;

  public async getChildren(
    item: TreePresenterItem<T> | null,
  ): Promise<TreePresenterItem<T>[]> {
    const state = this.ensureState(
      item ? item.id : TREE_PRESENTER_ROOT_STATE_ID,
    );
    if (!state.loaded || state.loadingError) {
      await this.requestChildren(item);
      if (state.loadingError) {
        throw new Error(state.loadingError);
      }
    }
    return state.children;
  }

  public async requestChildren(
    item: TreePresenterItem<T> | null,
    reload = true,
  ): Promise<void> {
    const state = this.ensureState(
      item ? item.id : TREE_PRESENTER_ROOT_STATE_ID,
    );
    if (state.loadingTask) {
      try {
        await state.loadingTask;
      } catch {
        // Do nothing
      }
      return;
    }
    if (state.loaded && !reload) {
      return;
    }
    let task: Promise<TreePresenterItem<T>[]> | undefined;
    try {
      state.loadingError = null;
      task = this.loadChildrenImpl(item);
      state.loadingTask = task;
      const children = await state.loadingTask;
      if (state.loadingTask === task) {
        // Check not cancelled
        state.children = children;
      }
    } catch (err: any) {
      if (state.loadingTask === task) {
        state.loadingError = err;
      }
    } finally {
      if (state.loadingTask === task) {
        state.loadingTask = null;
        state.loaded = true;
      }
    }
  }

  *expandedNodes(): Generator<TreePresenterItemInTree<T>> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    function* iterateState(
      state: TreePresenterNodeState<T> | undefined,
      parents: TreePresenterItem<T>[],
    ) {
      if (!state) return;
      const state_transformed_children = self.transformChildren(state.children);
      for (const item of state_transformed_children) {
        yield {
          item: item,
          parents,
        } as TreePresenterItemInTree<T>;
        const child_state = self.getState(item.id);
        if (child_state && child_state.expanded) {
          for (const ch of iterateState(child_state, [...parents, item])) {
            yield ch;
          }
        }
      }
    }
    for (const item of iterateState(
      this.getState(TREE_PRESENTER_ROOT_STATE_ID),
      [],
    )) {
      yield item;
    }
  }

  expandedNodesAsArray(): TreePresenterItemInTree<T>[] {
    return [...this.expandedNodes()];
  }

  expandedNodesGetChildrenOf(
    node: TreePresenterItemInTree<T> | null,
  ): TreePresenterItemInTree<T>[] {
    if (!node) return this.expandedNodesAsArray();

    const res: TreePresenterItemInTree<T>[] = [];
    for (const it of this.expandedNodes()) {
      let is_child = false;
      for (let p = it.parents.length - 1; p >= 0; p--) {
        if (
          sameTreePresenterNodes(
            {
              item: it.parents[p],
              parents: it.parents.slice(0, p),
            },
            node,
          )
        ) {
          is_child = true;
          break;
        }
      }
      if (is_child) {
        res.push(it);
      }
    }
    return res;
  }

  getNextNode(
    node: TreePresenterItemInTree<T>,
  ): TreePresenterItemInTree<T> | undefined {
    let found = false;
    for (const it of this.expandedNodes()) {
      if (sameTreePresenterNodes(it, node)) {
        found = true;
      } else if (found) {
        return it;
      }
    }
    return undefined;
  }

  getPreviousNode(
    node: TreePresenterItemInTree<T>,
  ): TreePresenterItemInTree<T> | undefined {
    let prev: TreePresenterItemInTree<T> | undefined = undefined;
    for (const it of this.expandedNodes()) {
      if (sameTreePresenterNodes(it, node)) {
        return prev;
      }
      prev = it;
    }
    return undefined;
  }

  getSelectionInfo(selection: TreePresenterItem<T>[]) {
    const info: TreePresenterSelectionInfo<T> = {
      selectedIds: new Set([...selection.map((i) => i.id)]),
      selectedNodes: [],
      frameStarts: [],
      frameEnds: [],
    };
    const expanded_nodes = this.expandedNodesAsArray();
    let in_frame = false;
    let prev_node: TreePresenterItemInTree<T> | undefined = undefined;
    for (const node of expanded_nodes) {
      if (info.selectedIds.has(node.item.id)) {
        if (!in_frame) {
          in_frame = true;
          info.frameStarts.push(node);
        }
        info.selectedNodes.push(node);
      } else {
        if (in_frame) {
          assert(prev_node);
          in_frame = false;
          info.frameEnds.push(prev_node);
        }
      }
      prev_node = node;
    }
    if (in_frame) {
      assert(expanded_nodes.length > 0);
      info.frameEnds.push(expanded_nodes[expanded_nodes.length - 1]);
    }
    return info;
  }

  protected transformChildren(
    children: TreePresenterItem<T>[],
  ): TreePresenterItem<T>[] {
    return children;
  }

  getDisplayingChildren(id: string): TreePresenterItem<T>[] {
    const state = this.getState(id);
    if (!state) return [];
    return this.transformChildren(state.children);
  }

  toJSON(): Record<string, any> {
    return {
      nodeStates: Object.fromEntries(this.nodeStates),
    };
  }

  loadJSON(data: Record<string, any>): void {
    this.nodeStates = new Map(Object.entries(data.nodeStates));
  }
}
