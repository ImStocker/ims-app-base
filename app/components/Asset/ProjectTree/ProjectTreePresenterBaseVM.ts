import {
  TreePresenterBaseVM,
  type TreePresenterDragOverResult,
  type TreePresenterItem,
  type TreePresenterItemInTree,
  type TreePresenterNodeState,
} from '../../Common/TreePresenter/TreePresenter';
import {
  WORKSPACE_TYPE_COLLECTION,
  type Workspace,
  type WorkspaceMoveParams,
} from '../../../logic/types/Workspaces';
import type { IAppManager } from '../../../logic/managers/IAppManager';
import CreatorAssetManager from '../../../logic/managers/CreatorAssetManager';
import type {
  AssetForSelection,
  AssetMoveParams,
  AssetShort,
} from '../../../logic/types/AssetsType';
import {
  MIN_ASSET_RIGHTS_TO_MOVE,
  MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT,
  MIN_WORKSPACE_RIGHTS_TO_MOVE,
} from '../../../logic/types/Rights';
import ProjectManager from '../../../logic/managers/ProjectManager';
import ProjectContentManager from '../../../logic/managers/ProjectContentManager';
import {
  getBetweenIndexWithTimestamp,
  getNextIndexWithTimestamp,
} from '../Editor/blockUtils';
import type { AssetPropValueAsset } from '../../../logic/types/Props';

export type ProjectTreeItemPayload = {
  id: string;
  inheritanceLevel?: number;
  type: 'asset' | 'workspace' | 'additional' | 'contents';
  index: number | null;
};

export type DragDataProjectItems = {
  items: {
    id: string;
    title?: string;
    type: 'asset' | 'workspace';
  }[];
};
export type DragDataAsset = {
  id: string;
  title?: string | null;
};
export type DragDataWorkspace = {
  id: string;
};

export type ProjectTreePresenterDragContext = {
  canMove: boolean;
  sourceWorkspaceId: string | null | undefined; // undefined -> multiple sources
};

export type ProjectTreePresenterDropTarget = {
  workspace: Workspace | null | undefined;
  beforeNode: TreePresenterItemInTree<ProjectTreeItemPayload> | undefined;
};

export abstract class ProjectTreePresenterBaseVM extends TreePresenterBaseVM<ProjectTreeItemPayload> {
  protected dragSelfContext: ProjectTreePresenterDragContext | null = null;
  protected loadedRootWorkspaceId: string | null | undefined = undefined;

  public constructor(public appManager: IAppManager) {
    super();
  }

  protected makeItemForAssetShort(
    asset: AssetShort,
  ): TreePresenterItem<ProjectTreeItemPayload> {
    return {
      id: `asset:${asset.id}`,
      title: asset.title ?? '',
      expandable: false,
      payload: {
        id: asset.id,
        type: 'asset',
        index: asset.index,
      },
      draggable: true,
    };
  }

  protected makeItemForContents(
    assetItem: TreePresenterItem<ProjectTreeItemPayload>,
  ): TreePresenterItem<ProjectTreeItemPayload> {
    return {
      id: `contents:${assetItem.payload.id}`,
      expandable: false,
      disabled: true,
      title: '',
      payload: {
        id: assetItem.payload.id,
        type: 'contents',
        index: assetItem.payload.index,
      },
      draggable: false,
    };
  }

  protected makeItemForWorkspace(
    workspace: Workspace,
  ): TreePresenterItem<ProjectTreeItemPayload> {
    return {
      id: `workspace:${workspace.id}`,
      expandable: true,
      title: workspace.title,
      payload: {
        id: workspace.id,
        type: 'workspace',
        index: workspace.index,
      },
      draggable: true,
    };
  }

  protected makeItemForAdditional(
    additional: AssetForSelection,
    index: number,
  ): TreePresenterItem<ProjectTreeItemPayload> {
    return {
      id: `additional:${additional.id}`,
      expandable: false,
      title: additional.title ?? '',
      payload: {
        id: additional.id,
        type: 'additional',
        index: index,
      },
      draggable: false,
    };
  }

  public override dragStart(
    nodes: TreePresenterItemInTree<ProjectTreeItemPayload>[],
  ): { format: string; data: any } | null {
    nodes = nodes.filter(
      (node) =>
        node.item.payload.type === 'asset' ||
        node.item.payload.type === 'workspace',
    );

    if (nodes.length === 0) {
      return null;
    }

    let canMove = false;
    let sourceWorkspaceId: string | null | undefined = undefined;
    let first = false;
    for (const node of nodes) {
      if (node.item.payload.type === 'asset') {
        const asset = this.appManager
          .get(CreatorAssetManager)
          .getAssetShortViaCacheSync(node.item.payload.id);
        if (asset && asset.rights >= MIN_ASSET_RIGHTS_TO_MOVE) {
          canMove = true;
          if (sourceWorkspaceId !== asset.workspaceId) {
            sourceWorkspaceId = first ? asset.workspaceId : undefined;
          }
        }
      } else if (node.item.payload.type === 'workspace') {
        const workspace = this.appManager
          .get(CreatorAssetManager)
          .getWorkspaceByIdViaCacheSync(node.item.payload.id);
        if (workspace && workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_MOVE) {
          canMove = true;
          if (sourceWorkspaceId !== workspace.parentId) {
            sourceWorkspaceId = first ? workspace.parentId : undefined;
          }
        }
      }
      first = false;
    }

    this.dragSelfContext = {
      canMove,
      sourceWorkspaceId,
    };

    if (nodes.length === 1) {
      return {
        format: nodes[0].item.payload.type,
        data: {
          id: nodes[0].item.payload.id,
          title: nodes[0].item.title,
        } as DragDataAsset | DragDataWorkspace,
      };
    } else {
      return {
        format: 'project-items',
        data: {
          items: nodes.map((n) => {
            return {
              type: n.item.payload.type,
              id: n.item.payload.id,
              title: n.item.title,
            };
          }),
        } as DragDataProjectItems,
      };
    }
  }

  override dragEnd(
    _nodes: TreePresenterItemInTree<ProjectTreeItemPayload>[],
  ): void {
    this.dragSelfContext = null;
  }

  protected get isDragDropAllowed() {
    return false;
  }

  public override getDragOverEffect(
    targetNode: TreePresenterItemInTree<ProjectTreeItemPayload> | null,
    dt: DataTransfer,
    inside = false,
  ): TreePresenterDragOverResult {
    if (!this.isDragDropAllowed) {
      return 'none';
    }
    if (this.dragSelfContext && !this.dragSelfContext.canMove) {
      return 'none';
    }
    if (targetNode && targetNode.item.payload.type === 'additional') {
      return 'none';
    }
    if (targetNode && targetNode.item.payload.type === 'contents') {
      return 'none';
    }
    for (const type of dt.types) {
      switch (type) {
        case 'Files':
        case 'asset':
        case 'workspace':
        case 'project-items': {
          const drop_target = this.getDropTarget(targetNode, dt.types, inside);
          const source_workspace_id = this.dragSelfContext
            ? this.dragSelfContext.sourceWorkspaceId
            : undefined;
          if (
            drop_target.workspace !== undefined &&
            (drop_target.workspace?.id ?? null) !== source_workspace_id
          ) {
            if (drop_target.workspace) {
              if (
                drop_target.workspace.rights <
                MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT
              ) {
                return 'none';
              }
            } else {
              const user_role = this.appManager
                .get(ProjectManager)
                .getUserRoleInProject();
              if (!user_role || !user_role.isAdmin) {
                return 'none'; // Only admin can add items to project root
              }
            }
          }

          if (drop_target.beforeNode !== undefined) {
            return {
              position: 'before',
              effect: 'move',
            };
          } else {
            return 'move';
          }
        }
      }
    }
    return 'none';
  }

  protected async moveContent(
    target: ProjectTreePresenterDropTarget,
    drop: {
      assets: AssetShort[];
      workspaces: Workspace[];
    },
  ) {
    const moving_assets_params: AssetMoveParams = {
      ids: drop.assets.map((a) => a.id),
    };
    const moving_workspace_params: WorkspaceMoveParams = {
      ids: drop.workspaces.map((w) => w.id),
    };

    let any_move = false;

    if (target.beforeNode !== undefined) {
      const next_item = target.beforeNode.item;

      // Check if move to itself
      if (next_item.payload.type === 'asset') {
        if (drop.assets.some((a) => a.id === next_item.payload.id)) {
          return;
        }
      } else {
        if (drop.workspaces.some((w) => w.id === next_item.payload.id)) {
          return;
        }
      }

      const target_workspace_content = await this.getChildren(
        target.workspace ? this.makeItemForWorkspace(target.workspace) : null,
      );

      const target_workspace_content_without_moving =
        target_workspace_content.filter((tw) => {
          if (tw.payload.type === 'asset') {
            return !drop.assets.some((a) => a.id === tw.payload.id);
          } else if (tw.payload.type === 'workspace') {
            return !drop.workspaces.some((w) => w.id === tw.payload.id);
          } else return false;
        });

      const insert_before_pos =
        target_workspace_content_without_moving.findIndex(
          (i) => i.id === next_item.id,
        );

      let index_before: number | undefined = undefined;
      const mov_prev_items: TreePresenterItem<ProjectTreeItemPayload>[] = [];
      for (let i = insert_before_pos - 1; i >= -1; i--) {
        if (i >= 0) {
          const item = target_workspace_content_without_moving[i];
          if (item.payload.type !== next_item.payload.type) {
            break;
          }
          index_before = item.payload.index ?? undefined;
          if (item.payload.index !== next_item.payload.index) {
            break;
          }
          mov_prev_items.unshift(item);
        } else {
          index_before = undefined;
        }
      }

      const index_to =
        next_item.payload.index !== null ? next_item.payload.index : undefined;
      const index_from =
        index_to !== undefined
          ? index_before !== undefined
            ? getBetweenIndexWithTimestamp(index_before, index_to)
            : undefined
          : index_before !== undefined
            ? getNextIndexWithTimestamp(index_before)
            : 1;
      if (next_item.payload.type === 'asset') {
        moving_assets_params.indexTo = index_to;
        moving_assets_params.indexFrom = index_from;
        moving_assets_params.ids = [
          ...mov_prev_items.map((it) => it.payload.id),
          ...drop.assets.map((a) => a.id),
        ];
      } else {
        moving_workspace_params.indexTo = index_to;
        moving_workspace_params.indexFrom = index_from;
        moving_workspace_params.ids = [
          ...mov_prev_items.map((it) => it.payload.id),
          ...drop.workspaces.map((w) => w.id),
        ];
      }
      any_move = true;
    }

    const from_workspace_id: string | null | undefined = (() => {
      let from_workspace_id: string | null | undefined = undefined;
      let first = true;
      for (const asset of drop.assets) {
        if (!first && from_workspace_id === undefined) break;
        if (from_workspace_id !== asset.workspaceId) {
          from_workspace_id = first ? asset.workspaceId : undefined;
        }
        first = false;
      }
      for (const workspace of drop.workspaces) {
        if (!first && from_workspace_id === undefined) break;
        if (from_workspace_id !== workspace.parentId) {
          from_workspace_id = first ? workspace.parentId : undefined;
        }
        first = false;
      }
      return from_workspace_id;
    })();

    if (
      target.workspace !== undefined &&
      from_workspace_id !== (target.workspace?.id ?? null)
    ) {
      if (target.workspace) {
        const target_workspace_is_collection =
          target.workspace.props.type === WORKSPACE_TYPE_COLLECTION;
        const target_collection_asset_id =
          target_workspace_is_collection && target.workspace.props.asset
            ? (target.workspace.props.asset as AssetPropValueAsset).AssetId
            : null;
        if (target_workspace_is_collection) {
          for (const workspace of drop.workspaces) {
            if (workspace.props.type !== WORKSPACE_TYPE_COLLECTION) {
              throw new Error(
                this.appManager.$t(
                  'sourcePage.folders.collection.cannotDropFolder',
                ),
              );
            }
            const workspace_asset_id = workspace.props.asset
              ? (workspace.props.asset as AssetPropValueAsset).AssetId
              : null;
            const workspace_collection_asset = workspace_asset_id
              ? await this.appManager
                  .get(CreatorAssetManager)
                  .getAssetShortViaCache(workspace_asset_id)
              : null;
            if (
              !workspace_collection_asset ||
              !target_collection_asset_id ||
              (!workspace_collection_asset.typeIds.includes(
                target_collection_asset_id,
              ) &&
                workspace_collection_asset.id !== target_collection_asset_id)
            ) {
              throw new Error(
                this.appManager.$t(
                  'sourcePage.folders.collection.cannotDropAssetTypeMissmatched',
                ),
              );
            }
          }
          for (const asset of drop.assets) {
            if (
              !target_collection_asset_id ||
              (!asset.typeIds.includes(target_collection_asset_id) &&
                asset.id !== target_collection_asset_id)
            ) {
              throw new Error(
                this.appManager.$t(
                  'sourcePage.folders.collection.cannotDropAssetTypeMissmatched',
                ),
              );
            }
          }
        }
      }
      moving_assets_params.workspaceId = target.workspace?.id ?? null;
      moving_workspace_params.parentId = target.workspace?.id ?? null;
      any_move = true;
    }

    if (any_move) {
      if (moving_assets_params.ids.length > 0) {
        await this.appManager
          .get(CreatorAssetManager)
          .moveAssets(moving_assets_params);
      }
      if (moving_workspace_params.ids.length > 0) {
        await this.appManager
          .get(CreatorAssetManager)
          .moveWorkspaces(moving_workspace_params);
      }
    }
  }

  protected getDropTarget(
    targetNode: TreePresenterItemInTree<ProjectTreeItemPayload> | null,
    dataTransferFormats: readonly string[],
    inside = false,
  ): ProjectTreePresenterDropTarget {
    let target_parent_workspace_id: string | null | undefined = undefined;
    let before_node:
      | TreePresenterItemInTree<ProjectTreeItemPayload>
      | undefined = undefined;
    const move_workspace = dataTransferFormats.includes('workspace');

    if (targetNode) {
      if (
        (!move_workspace || inside) &&
        targetNode.item.payload.type === 'workspace'
      ) {
        target_parent_workspace_id = targetNode.item.payload.id;
      } else {
        before_node = targetNode;
        if (targetNode.parents.length > 0) {
          const last_parent = targetNode.parents[targetNode.parents.length - 1];
          if (last_parent.payload.type === 'workspace') {
            target_parent_workspace_id = last_parent.payload.id;
          }
        } else {
          target_parent_workspace_id = this.loadedRootWorkspaceId;
        }
      }
    } else {
      if (this.loadedRootWorkspaceId !== undefined) {
        target_parent_workspace_id = this.loadedRootWorkspaceId;
      }
    }
    const target_parent_workspace = target_parent_workspace_id
      ? this.appManager
          .get(CreatorAssetManager)
          .getWorkspaceByIdViaCacheSync(target_parent_workspace_id)
      : target_parent_workspace_id === null
        ? null
        : undefined;

    return {
      beforeNode: before_node,
      workspace: target_parent_workspace,
    };
  }

  public override async dragDrop(
    targetNode: TreePresenterItemInTree<ProjectTreeItemPayload> | null,
    dt: DataTransfer,
    inside = false,
  ): Promise<void> {
    if (!this.isDragDropAllowed) {
      return;
    }

    const drop_target = this.getDropTarget(targetNode, dt.types, inside);

    const moving_content_asset_ids: string[] = [];
    const moving_content_workspace_ids: string[] = [];

    for (const dt_item of dt.items) {
      if (dt_item.kind === 'file') {
        // import
        if (drop_target.workspace === undefined) return; // No drop target
        await this.appManager
          .get(ProjectContentManager)
          .importFiles(
            drop_target.workspace ? drop_target.workspace.id : null,
            [...dt.files],
          );
      } else {
        switch (dt_item.type) {
          case 'asset': {
            const drag_data = JSON.parse(
              dt.getData(dt_item.type),
            ) as DragDataAsset;
            moving_content_asset_ids.push(drag_data.id);
            break;
          }
          case 'workspace': {
            const drag_data = JSON.parse(
              dt.getData(dt_item.type),
            ) as DragDataWorkspace;
            moving_content_workspace_ids.push(drag_data.id);
            break;
          }
          case 'project-items': {
            const drag_data = JSON.parse(
              dt.getData(dt_item.type),
            ) as DragDataProjectItems;
            for (const item of drag_data.items) {
              if (item.type === 'asset') {
                moving_content_asset_ids.push(item.id);
              } else if (item.type === 'workspace') {
                moving_content_workspace_ids.push(item.id);
              }
            }
          }
        }
      }
    }

    const moving_content_assets = (
      await Promise.all(
        moving_content_asset_ids.map((id) => {
          return this.appManager
            .get(CreatorAssetManager)
            .getAssetShortViaCache(id);
        }),
      )
    ).filter((x) => x) as AssetShort[];
    const moving_content_workspaces = (
      await Promise.all(
        moving_content_workspace_ids.map((id) => {
          return this.appManager
            .get(CreatorAssetManager)
            .getWorkspaceByIdViaCache(id);
        }),
      )
    ).filter((x) => x) as Workspace[];

    if (
      moving_content_assets.length > 0 ||
      moving_content_workspaces.length > 0
    ) {
      await this.moveContent(drop_target, {
        assets: moving_content_assets,
        workspaces: moving_content_workspaces,
      });
    }
  }

  protected reorderStateChildren(
    state: TreePresenterNodeState<ProjectTreeItemPayload>,
  ) {
    state.children.sort((a, b) => {
      if (a.payload.type !== b.payload.type) {
        if (a.payload.type === 'asset') return -1;
        else if (a.payload.type === 'workspace') {
          return b.payload.type === 'asset' ? 1 : -1;
        } else return 1;
      }

      const a_params = { index: a.payload.index, title: a.title };
      const b_params = { index: b.payload.index, title: b.title };

      if (a_params.index !== null && b_params.index === null) {
        return -1;
      } else if (b_params.index !== null && a_params.index === null) {
        return 1;
      } else if (
        a_params.index !== null &&
        b_params.index !== null &&
        a_params.index !== b_params.index
      ) {
        return a_params.index - b_params.index;
      } else {
        return (a_params.title ?? '').localeCompare(b_params.title ?? '');
      }
    });
  }

  protected isRootWorkspaceId(workspace_id: string | null) {
    if (workspace_id === null) {
      return true;
    }
    if (
      this.loadedRootWorkspaceId !== undefined &&
      this.loadedRootWorkspaceId === workspace_id
    ) {
      return true;
    }
    return false;
  }

  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      loadedRootWorkspaceId: this.loadedRootWorkspaceId,
    };
  }

  override loadJSON(data: Record<string, any>): void {
    super.loadJSON(data);
    this.loadedRootWorkspaceId = data.loadedRootWorkspaceId;
  }
}
