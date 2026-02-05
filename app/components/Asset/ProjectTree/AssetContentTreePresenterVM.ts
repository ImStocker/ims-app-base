import {
  TreePresenterBaseVM,
  type TreePresenterItem,
} from '../../Common/TreePresenter/TreePresenter';
import type { BlockContentItem } from '../../../logic/types/BlockTypeDefinition';

export type AssetContentTreePresenterPayload = BlockContentItem<any>;

export class AssetContentTreePresenterVM extends TreePresenterBaseVM<AssetContentTreePresenterPayload> {
  setContent(contents: BlockContentItem<any>[]) {
    const fill_state = (id: string, children: BlockContentItem<any>[]) => {
      const state = this.ensureState(id);
      state.loaded = true;
      state.children = [];
      for (const element of children) {
        const child_id = element.blockId + ':' + element.itemId;
        const item: TreePresenterItem<AssetContentTreePresenterPayload> = {
          id: child_id,
          payload: element,
          expandable: !!element.children,
          disabled: element.anchor === undefined && !element.selectable,
          title: element.title,
        };
        state.children.push(item);
        if (element.children) {
          fill_state(child_id, element.children);
        }
      }
    };
    fill_state('', contents);
  }

  revealContentById(itemId: string) {
    const find_item = (current_node_id: string): string[] | null => {
      if (current_node_id === itemId) {
        return [];
      }
      const state = this.getState(current_node_id);
      if (!state) return null;
      for (const item of state.children) {
        const in_children = find_item(item.id);
        if (in_children) {
          return [item.id, ...in_children];
        }
      }
      return null;
    };

    const path_ids = find_item('');
    if (!path_ids) return;
    for (const path_id of path_ids) {
      const state = this.getState(path_id);
      if (state) {
        state.expanded = true;
      }
    }
  }

  revealContentListById(itemIds: string[]) {
    for (const itemId of itemIds) {
      this.revealContentById(itemId);
    }
  }

  findItemsByIds(
    itemIds: string[],
  ): TreePresenterItem<AssetContentTreePresenterPayload>[] {
    const find = (
      itemId: string,
      current_node_id: string,
    ): TreePresenterItem<AssetContentTreePresenterPayload> | null => {
      const state = this.getState(current_node_id);
      if (!state) return null;
      for (const item of state.children) {
        if (item.id === itemId) {
          return item;
        } else {
          const found = find(itemId, item.id);
          if (found) return found;
        }
      }
      return null;
    };
    const res: TreePresenterItem<AssetContentTreePresenterPayload>[] = [];
    for (const itemId of itemIds) {
      const found = find(itemId, '');
      if (found) res.push(found);
    }
    return res;
  }

  protected override async loadChildrenImpl(
    item: TreePresenterItem<AssetContentTreePresenterPayload> | null,
  ): Promise<TreePresenterItem<AssetContentTreePresenterPayload>[]> {
    const state = this.ensureState(item ? item.id : '');
    return state.children;
  }
}
