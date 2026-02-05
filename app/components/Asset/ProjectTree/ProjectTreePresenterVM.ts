import isUUID from 'validator/es/lib/isUUID';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
  type AssetPropWhereCondition,
  type AssetPropWhereOp,
  type AssetPropWhereOpAnd,
} from '../../../logic/types/PropsWhere';
import {
  TREE_PRESENTER_ROOT_STATE_ID,
  type TreePresenterItem,
  type TreePresenterNodeState,
} from '../../Common/TreePresenter/TreePresenter';
import type {
  Workspace,
  WorkspaceQueryDTOWhere,
} from '../../../logic/types/Workspaces';
import type { IAppManager } from '../../../logic/managers/IAppManager';
import CreatorAssetManager, {
  type CreatorAssetEventsArg,
  type CreatorWorkspaceEventsArg,
} from '../../../logic/managers/CreatorAssetManager';
import { intersectObjectArrays } from '../../../logic/utils/array';
import type {
  AssetForSelection,
  AssetShort,
} from '../../../logic/types/AssetsType';
import { assert } from '../../../logic/utils/typeUtils';
import type { SubscriberHandler } from '../../../logic/types/Subscriber';
import { escapeRegExp } from '../../../logic/utils/stringUtils';
import { convertTranslatedTitle } from '../../../logic/utils/assets';
import {
  ProjectTreePresenterBaseVM,
  type ProjectTreeItemPayload,
} from './ProjectTreePresenterBaseVM';
import ProjectManager from '../../../logic/managers/ProjectManager';
import { getWorkspaceCollectionAsset } from '../../GameDesign/workspaceUtils';

export type ProjectTreePresenterVMOptions = {
  assetWhere: AssetPropWhere;
  showWorkspaceTree: boolean;
  hideNonAlternativeWorkspaces: boolean;
  hideEmptyWorkspaces: boolean;
  showAssetInheritance: boolean;
  showAssetContent: boolean;
  allowDragChange: boolean;
  allowSelectWorkspaces: boolean;
  additionalOptions: AssetForSelection[];
};

export function getDefaultProjectTreePresenterVMOptions(): ProjectTreePresenterVMOptions {
  return {
    assetWhere: {},
    showWorkspaceTree: true,
    hideNonAlternativeWorkspaces: false,
    hideEmptyWorkspaces: false,
    showAssetInheritance: false,
    showAssetContent: false,
    allowDragChange: false,
    allowSelectWorkspaces: true,
    additionalOptions: [],
  };
}

type ProjectTreePresenterAnalyzedWhere = {
  willFindNothing: boolean;
  rootWorkspaces: Workspace[];
  rootWorkspacesStrict: boolean;
  assetWhereWithoutWorkspace: AssetPropWhere;
  query: string | undefined;
  isSystem: boolean | undefined;
};

export class ProjectTreePresenterVM extends ProjectTreePresenterBaseVM {
  private _reloadSubscriber: SubscriberHandler | null = null;
  private _assetEventsSubscriber: SubscriberHandler | null = null;
  private _workspaceEventsSubscriber: SubscriberHandler | null = null;
  private _analyzedWhere: ProjectTreePresenterAnalyzedWhere | null = null;
  protected _loadedHiddenNonAlternativeIds: string[] = [];
  protected _options: ProjectTreePresenterVMOptions;
  private _externalUpdateByEventTask = Promise.resolve();
  private _inited: boolean = false;
  private _loadedForProjectId: string | null = null;
  private _changeProjectSubscriber: SubscriberHandler | null = null;

  get inited() {
    return this._inited;
  }

  public constructor(
    appManager: IAppManager,
    options: ProjectTreePresenterVMOptions = getDefaultProjectTreePresenterVMOptions(),
  ) {
    super(appManager);
    this._options = options;
  }

  public get options() {
    return this._options;
  }

  public setOptions(set: Partial<ProjectTreePresenterVMOptions>) {
    let need_reload = false;
    if (
      set.assetWhere !== undefined &&
      JSON.stringify(set.assetWhere) !==
        JSON.stringify(this._options.assetWhere)
    ) {
      this._options.assetWhere = set.assetWhere;
      this._analyzedWhere = null;
      need_reload = true;
    }
    if (
      set.additionalOptions !== undefined &&
      JSON.stringify(set.additionalOptions) !==
        JSON.stringify(this._options.additionalOptions)
    ) {
      this._options.additionalOptions = set.additionalOptions;
      need_reload = true;
    }
    if (
      set.showWorkspaceTree !== undefined &&
      set.showWorkspaceTree !== this._options.showWorkspaceTree
    ) {
      this._options.showWorkspaceTree = set.showWorkspaceTree;
      need_reload = true;
    }
    if (
      set.hideNonAlternativeWorkspaces !== undefined &&
      set.hideNonAlternativeWorkspaces !==
        this._options.hideNonAlternativeWorkspaces
    ) {
      this._options.hideNonAlternativeWorkspaces =
        set.hideNonAlternativeWorkspaces;
      need_reload = true;
    }
    if (
      set.hideEmptyWorkspaces !== undefined &&
      set.hideEmptyWorkspaces !== this._options.hideEmptyWorkspaces
    ) {
      this._options.hideEmptyWorkspaces = set.hideEmptyWorkspaces;
      need_reload = true;
    }
    if (
      set.showAssetInheritance !== undefined &&
      set.showAssetInheritance !== this._options.showAssetInheritance
    ) {
      this._options.showAssetInheritance = set.showAssetInheritance;
    }
    if (
      set.allowDragChange !== undefined &&
      set.allowDragChange !== this._options.allowDragChange
    ) {
      this._options.allowDragChange = set.allowDragChange;
    }
    if (
      set.allowSelectWorkspaces !== undefined &&
      set.allowSelectWorkspaces !== this._options.allowSelectWorkspaces
    ) {
      this._options.allowSelectWorkspaces = set.allowSelectWorkspaces;
      need_reload = true;
    }
    if (
      set.showAssetContent !== undefined &&
      set.showAssetContent !== this._options.showAssetContent
    ) {
      this._options.showAssetContent = set.showAssetContent;
      need_reload = true;
    }
    if (need_reload) {
      this.forgetChildren(TREE_PRESENTER_ROOT_STATE_ID);
    }
  }

  private async _analyzeWhereForWorkspaces(): Promise<ProjectTreePresenterAnalyzedWhere> {
    if (this._analyzedWhere) {
      return this._analyzedWhere;
    }
    let willFindNothing = false;
    let rootWorkspacesStrict = false;
    let rootWorkspaces: Workspace[] = [];
    let query: string | undefined = undefined;
    let isSystem: boolean | undefined = undefined;

    const process_key_val = async (
      key: string,
      val: AssetPropWhereCondition,
    ) => {
      let skip_key = false;

      if (key === 'query' && typeof val === 'string') {
        query = val;
      } else if (
        (key === 'isSystem' || key === 'issystem') &&
        typeof val === 'boolean'
      ) {
        isSystem = val;
      } else if (
        key === 'workspaceid' ||
        key === 'workspaceId' ||
        key === 'workspaceids' ||
        key === 'inside'
      ) {
        let val_arr: string[];
        if (typeof val === 'string') {
          val_arr = [val];
        } else if (
          Array.isArray(val) &&
          val.every((v) => typeof v === 'string')
        ) {
          val_arr = val;
        } else {
          return skip_key;
        }

        let inside_check = false;
        let workspace_ids: string[] = [];
        const workspace_names: string[] = [];
        switch (key) {
          case 'workspaceid':
          case 'workspaceId':
            workspace_ids = val_arr;
            break;
          case 'workspaceids':
            workspace_ids = val_arr;
            inside_check = true;
            break;
          case 'inside':
            for (const val_item of val_arr) {
              if (isUUID(val_item)) {
                workspace_ids.push(val_item);
              } else {
                workspace_names.push(val_item);
              }
            }
            inside_check = true;
            break;
        }

        const workspace_load: Promise<Workspace | null>[] = [];
        for (const workspace_id of workspace_ids) {
          workspace_load.push(
            this.appManager
              .get(CreatorAssetManager)
              .getWorkspaceByIdViaCache(workspace_id),
          );
        }
        for (const workspace_name of workspace_names) {
          workspace_load.push(
            this.appManager
              .get(CreatorAssetManager)
              .getWorkspaceByNameViaCache(workspace_name),
          );
        }

        const workspaces = await Promise.all(workspace_load);
        const exists_workspaces = workspaces.filter((w) => w) as Workspace[];

        if (
          workspaces.length > 0 &&
          workspaces.length === exists_workspaces.length
        ) {
          if (rootWorkspaces.length === 0) {
            rootWorkspaces = exists_workspaces;
            rootWorkspacesStrict = !inside_check;
          } else {
            if (inside_check || !rootWorkspacesStrict) {
              const all_workspaces_inside_workspaces = async (
                w_list: Workspace[],
                target_w_list: Workspace[],
              ) => {
                return (
                  await Promise.all(
                    w_list.map(async (w) => {
                      return (
                        await Promise.all(
                          target_w_list.map((tw) => {
                            this.appManager
                              .get(CreatorAssetManager)
                              .checkWorkspaceIsInside(w.id, tw.id);
                          }),
                        )
                      ).some((x) => x);
                    }),
                  )
                ).every((x) => x);
              };

              if (
                await all_workspaces_inside_workspaces(
                  exists_workspaces,
                  rootWorkspaces,
                )
              ) {
                rootWorkspaces = exists_workspaces;
              }
            } else {
              rootWorkspaces = intersectObjectArrays(
                rootWorkspaces,
                exists_workspaces,
              );
              if (rootWorkspaces.length === 0) willFindNothing = true;
            }
          }

          skip_key = true;
        }
      }
      return skip_key;
    };

    const process_where = async (
      where: AssetPropWhere,
    ): Promise<AssetPropWhere> => {
      const new_where: AssetPropWhere = {};
      for (const [key, val] of Object.entries(where)) {
        if (val === undefined) {
          continue;
        }

        if (
          val &&
          typeof val === 'object' &&
          (val as AssetPropWhereOp).op === AssetPropWhereOpKind.AND
        ) {
          const ands = (val as AssetPropWhereOpAnd).v;
          const new_ands: AssetPropWhere[] = [];
          for (const and of ands) {
            const new_and = await process_where(and);
            if (Object.keys(new_and).length > 0) {
              new_ands.push(new_and);
            }
          }
          if (new_ands.length > 0) {
            new_where[key] = {
              op: AssetPropWhereOpKind.AND,
              v: new_ands,
            };
          }
        } else {
          const skip_key = await process_key_val(key, val);
          if (!skip_key) {
            new_where[key] = val;
          }
        }
      }
      return new_where;
    };

    const assetWhereWithoutWorkspace = await process_where(
      this.options.assetWhere,
    );

    this._analyzedWhere = {
      willFindNothing,
      rootWorkspaces,
      rootWorkspacesStrict,
      assetWhereWithoutWorkspace,
      query,
      isSystem,
    };
    return this._analyzedWhere;
  }

  private async _loadAssets(where: AssetPropWhere) {
    const assets = (
      await this.appManager.get(CreatorAssetManager).getAssetShortsList({
        where,
      })
    ).list;
    const assets_with_image = assets.filter((a) => a.hasImage);
    await this.appManager
      .get(CreatorAssetManager)
      .requestAssetPreviewInCacheList(assets_with_image.map((a) => a.id));

    return assets;
  }

  private async _loadWorkspaces(
    where: WorkspaceQueryDTOWhere,
  ): Promise<Workspace[]> {
    const workspaces = (
      await this.appManager.get(CreatorAssetManager).getWorkspacesListAll({
        where,
      })
    ).list;

    const collection_asset_ids: string[] = [];
    for (const workspace of workspaces) {
      const collection_asset = getWorkspaceCollectionAsset(workspace);
      if (collection_asset) collection_asset_ids.push(collection_asset.AssetId);
    }
    await this.appManager
      .get(CreatorAssetManager)
      .requestAssetShortInCacheList(collection_asset_ids);

    return workspaces;
  }

  private async _loadWorkspaceSubTree(
    analyzed_where: ProjectTreePresenterAnalyzedWhere,
    parent_workspace_id: string | null | undefined,
    hide_without_alternate: boolean,
  ): Promise<{
    assets: AssetShort[];
    workspaces: Workspace[];
    hiddenNonAlternativeIds: string[];
    rootWorkspaceId: null | string | undefined;
  }> {
    let found_assets: AssetShort[] = [];
    let found_workspaces: Workspace[] = [];

    const workspace_where: WorkspaceQueryDTOWhere = {};
    if (this.options.hideEmptyWorkspaces) {
      if (Object.keys(analyzed_where.assetWhereWithoutWorkspace).length > 0) {
        workspace_where.hasAssets = analyzed_where.assetWhereWithoutWorkspace;
      } else workspace_where.hasAssets = true;
    }
    if (analyzed_where.isSystem !== undefined) {
      workspace_where.isSystem = analyzed_where.isSystem;
    }

    if (parent_workspace_id !== undefined) {
      workspace_where.parentId = parent_workspace_id;
      found_workspaces = await this._loadWorkspaces(workspace_where);
      found_assets = await this._loadAssets({
        ...analyzed_where.assetWhereWithoutWorkspace,
        workspaceId: parent_workspace_id,
      });
    } else {
      if (analyzed_where.rootWorkspaces.length > 0) {
        workspace_where.ids = analyzed_where.rootWorkspaces.map((w) => w.id);
      } else {
        workspace_where.isRoot = true;
      }
      found_workspaces = await this._loadWorkspaces(workspace_where);
    }
    if (
      hide_without_alternate &&
      found_workspaces.length === 1 &&
      found_assets.length === 0
    ) {
      const res = await this._loadWorkspaceSubTree(
        analyzed_where,
        found_workspaces[0].id,
        hide_without_alternate,
      );
      return {
        ...res,
        hiddenNonAlternativeIds: [
          found_workspaces[0].id,
          ...res.hiddenNonAlternativeIds,
        ],
      };
    }
    return {
      assets: found_assets,
      workspaces: found_workspaces,
      rootWorkspaceId: parent_workspace_id,
      hiddenNonAlternativeIds: [],
    };
  }

  protected override makeItemForAssetShort(asset: AssetShort) {
    const item = super.makeItemForAssetShort(asset);
    if (this.options.showAssetContent) item.expandable = true;
    return item;
  }

  protected override makeItemForWorkspace(
    workspace: Workspace,
  ): TreePresenterItem<ProjectTreeItemPayload> {
    const item = super.makeItemForWorkspace(workspace);
    if (!this.options.allowSelectWorkspaces) item.disabled = true;
    return item;
  }

  protected override async loadChildrenImpl(
    item: TreePresenterItem<ProjectTreeItemPayload> | null,
  ): Promise<TreePresenterItem<ProjectTreeItemPayload>[]> {
    await this._externalUpdateByEventTask; // Wait for hadling external updates
    const project_info = this.appManager.get(ProjectManager).getProjectInfo();
    this._loadedForProjectId = project_info ? project_info.id : null;

    if (item) {
      if (item.payload.type === 'asset') {
        return [this.makeItemForContents(item)];
      }
    }

    let found_assets: AssetShort[] = [];
    let found_workspaces: Workspace[] = [];
    let found_additional: AssetForSelection[] = [];

    const analyzed_where = await this._analyzeWhereForWorkspaces();
    if (!analyzed_where.willFindNothing) {
      if (this.options.showWorkspaceTree) {
        let parent_workspace_id: string | null | undefined =
          item && item.payload.type === 'workspace' ? item.payload.id : null;
        if (!item) {
          if (analyzed_where.rootWorkspaces.length === 1) {
            parent_workspace_id = analyzed_where.rootWorkspaces[0].id;
          } else if (analyzed_where.rootWorkspaces.length > 1) {
            parent_workspace_id = undefined;
          }
        }

        const found = await this._loadWorkspaceSubTree(
          analyzed_where,
          parent_workspace_id,
          !item && this.options.hideNonAlternativeWorkspaces,
        );
        found_assets = found.assets;
        found_workspaces = found.workspaces;
        if (!item) {
          this.loadedRootWorkspaceId = found.rootWorkspaceId;
          this._loadedHiddenNonAlternativeIds = found.hiddenNonAlternativeIds;
        }
      } else {
        found_assets = await this._loadAssets(this.options.assetWhere);
        if (!item) {
          this.loadedRootWorkspaceId = undefined;
          this._loadedHiddenNonAlternativeIds = [];
        }
      }
    } else {
      if (!item) {
        this.loadedRootWorkspaceId = undefined;
        this._loadedHiddenNonAlternativeIds = [];
      }
    }

    if (!item) {
      found_additional = this.options.additionalOptions;
      if (analyzed_where.query) {
        const query_pattern = new RegExp(
          escapeRegExp(analyzed_where.query),
          'i',
        );
        found_additional = found_additional.filter((ao) => {
          const translated = convertTranslatedTitle(ao.title ?? '', (...args) =>
            this.appManager.$t(...args),
          );
          return query_pattern.test(translated);
        });
      }
    }

    return [
      ...found_assets.map((a) => {
        return this.makeItemForAssetShort(a);
      }),
      ...found_workspaces.map((w) => {
        return this.makeItemForWorkspace(w);
      }),
      ...found_additional.map((ao, index) => {
        return this.makeItemForAdditional(ao, index);
      }),
    ];
  }

  protected override transformChildren(
    children: TreePresenterItem<ProjectTreeItemPayload>[],
  ): TreePresenterItem<ProjectTreeItemPayload>[] {
    if (!this.options.showAssetInheritance) {
      return children;
    }
    type InheritChildrens = {
      item: TreePresenterItem<ProjectTreeItemPayload>;
      parent: TreePresenterItem<ProjectTreeItemPayload> | null;
      children: InheritChildrens[];
    };
    const inherit_map = new Map<string, InheritChildrens>();
    for (const item of children) {
      inherit_map.set(item.id, {
        item,
        parent: null,
        children: [],
      });
    }
    for (const item of children) {
      if (item.payload.type !== 'asset') continue;
      const asset = this.appManager
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(item.payload.id);
      if (!asset) continue;
      for (const parent_id of asset.typeIds) {
        const parent_inh = inherit_map.get(`asset:${parent_id}`);
        if (parent_inh) {
          const this_inh = inherit_map.get(item.id);
          assert(this_inh);
          this_inh.parent = item;
          parent_inh.children.push(this_inh);
          break;
        }
      }
    }
    const res: TreePresenterItem<ProjectTreeItemPayload>[] = [];
    const push_res = (inh: InheritChildrens, level = 0) => {
      res.push({
        ...inh.item,
        payload: {
          ...inh.item.payload,
          inheritanceLevel: level,
        },
      });
      for (const ch_inh of inh.children) {
        push_res(ch_inh, level + 1);
      }
    };
    for (const inh of inherit_map.values()) {
      if (!inh.parent) {
        push_res(inh);
      }
    }
    return res;
  }

  protected override get isDragDropAllowed() {
    return this.options.allowDragChange && this.options.showWorkspaceTree;
  }

  private _resetInit(init: boolean) {
    if (this._reloadSubscriber) {
      this._reloadSubscriber.unsubscribe();
      this._reloadSubscriber = null;
    }
    if (this._assetEventsSubscriber) {
      this._assetEventsSubscriber.unsubscribe();
      this._assetEventsSubscriber = null;
    }
    if (this._workspaceEventsSubscriber) {
      this._workspaceEventsSubscriber.unsubscribe();
      this._workspaceEventsSubscriber = null;
    }
    if (this._changeProjectSubscriber) {
      this._changeProjectSubscriber.unsubscribe();
      this._changeProjectSubscriber = null;
    }
    if (init) {
      this._reloadSubscriber = this.appManager
        .get(CreatorAssetManager)
        .reloadSubscriber.subscribe(async (changes) => {
          this.forgetChildren(
            this.isRootWorkspaceId(changes.workspaceId ?? null)
              ? ''
              : 'workspace:' + changes.workspaceId,
          );
        });
      this._assetEventsSubscriber = this.appManager
        .get(CreatorAssetManager)
        .assetEvents.subscribe((change_res) => {
          // Don't await
          this.handleAssetsEvents(change_res);
        });
      this._workspaceEventsSubscriber = this.appManager
        .get(CreatorAssetManager)
        .workspaceEvents.subscribe((change_res) => {
          // Don't await
          this.handleWorkspacesEvents(change_res);
        });
      this._changeProjectSubscriber = this.appManager
        .get(ProjectManager)
        .changeProjectSubscriber.subscribe(({ newProjectId }) => {
          if (
            this._loadedForProjectId &&
            this._loadedForProjectId !== newProjectId
          ) {
            this.forgetChildren(TREE_PRESENTER_ROOT_STATE_ID);
          }
        });
    }
    this._inited = init;
  }

  init() {
    this._resetInit(true);
  }

  destroy() {
    this._resetInit(false);
  }

  private async _ensureWorkspacePathExists(
    workspace_id: string | null,
  ): Promise<TreePresenterNodeState<ProjectTreeItemPayload>> {
    if (workspace_id === this.loadedRootWorkspaceId) {
      return this.ensureState(TREE_PRESENTER_ROOT_STATE_ID);
    }
    const hidden_non_alternative_pos = workspace_id
      ? this._loadedHiddenNonAlternativeIds.indexOf(workspace_id)
      : -1;
    if (!workspace_id || hidden_non_alternative_pos >= 0) {
      if (
        this._loadedHiddenNonAlternativeIds.length > 0 &&
        this.loadedRootWorkspaceId
      ) {
        // Restore hidden non-alternative branches
        for (
          let i = this._loadedHiddenNonAlternativeIds.length - 1;
          i > hidden_non_alternative_pos;
          i--
        ) {
          const swapping_workspace = await this.appManager
            .get(CreatorAssetManager)
            .getWorkspaceByIdViaCache(this._loadedHiddenNonAlternativeIds[i]);
          if (!swapping_workspace) break;
          const root_state = this.ensureState(TREE_PRESENTER_ROOT_STATE_ID);
          const swap_to_state = this.ensureState(
            `workspace:${swapping_workspace.id}`,
          );
          swap_to_state.children = root_state.children;
          swap_to_state.loaded = true;
          swap_to_state.expanded = true;
          root_state.children = [this.makeItemForWorkspace(swapping_workspace)];
          root_state.loaded = true;
          this.loadedRootWorkspaceId =
            i > 0 ? this._loadedHiddenNonAlternativeIds[i - 1] : null;
          this._loadedHiddenNonAlternativeIds =
            this._loadedHiddenNonAlternativeIds.slice(0, i);
        }
      }
      return this.ensureState(TREE_PRESENTER_ROOT_STATE_ID);
    }
    const exists_parent_state = this.findOwnerState(
      `workspace:${workspace_id}`,
    );
    if (!exists_parent_state) {
      const workspace = await this.appManager
        .get(CreatorAssetManager)
        .getWorkspaceByIdViaCache(workspace_id);
      if (!workspace) {
        return this.ensureState(TREE_PRESENTER_ROOT_STATE_ID);
      }

      const parent_state = await this._ensureWorkspacePathExists(
        workspace.parentId,
      );
      if (parent_state.expanded) {
        if (
          parent_state.children.length === 0 &&
          parent_state.id === TREE_PRESENTER_ROOT_STATE_ID &&
          this.options.hideNonAlternativeWorkspaces
        ) {
          this._loadedHiddenNonAlternativeIds.push(workspace.id);
          this.loadedRootWorkspaceId = workspace.id;
          return this.ensureState(TREE_PRESENTER_ROOT_STATE_ID);
        } else {
          parent_state.children.push(this.makeItemForWorkspace(workspace));
          this.reorderStateChildren(parent_state);
        }
      }
    }
    return this.ensureState(`workspace:${workspace_id}`);
  }

  private _getAllVisibleWorkspaceIds() {
    const visible_workspace_ids: string[] = [];
    for (const node of this.expandedNodes()) {
      if (node.item.payload.type === 'workspace') {
        visible_workspace_ids.push(node.item.payload.id);
      }
    }
    return visible_workspace_ids;
  }

  private async _revalidateWorkspaceVisibility(workspace_ids: string[]) {
    if (workspace_ids.length === 0) {
      return;
    }
    if (!this._analyzedWhere) {
      return;
    }

    const visible_workspaces_condition: WorkspaceQueryDTOWhere = {
      ids: workspace_ids,
    };

    if (this.options.hideEmptyWorkspaces) {
      visible_workspaces_condition.hasAssets =
        this._analyzedWhere.assetWhereWithoutWorkspace;
    }

    const visible_workspaces = await this._loadWorkspaces(
      visible_workspaces_condition,
    );

    const missing_workspace_ids = new Set(workspace_ids);
    for (const w of visible_workspaces) {
      missing_workspace_ids.delete(w.id);
    }

    for (const workspace_id of missing_workspace_ids) {
      this.deleteItemInState(`workspace:${workspace_id}`);
    }
  }

  protected findWorkspaceOwnerForVisibilityRevalidate(
    item_id: string,
  ): string | null {
    const visible_chain = this.getVisibleOwnerStatesChain(item_id);
    if (visible_chain.length === 0) return null;

    // first always is root state
    for (let i = 1; i < visible_chain.length; i++) {
      const m = visible_chain[i].state.id.match(/^workspace:(.*)$/);
      if (!m) break;
      if (
        visible_chain[i].state.children.length === 1 ||
        i === visible_chain.length - 1
      ) {
        return m[1];
      }
    }

    return null;
  }

  protected async handleAssetsEvents(change_res: CreatorAssetEventsArg) {
    this._externalUpdateByEventTask = this._externalUpdateByEventTask.then(
      async () => {
        try {
          if (this._analyzedWhere && this._analyzedWhere.isSystem) {
            return;
          }

          let revalidate_visibility_workspace_ids = new Set<string>();
          let revalidate_visibility_of_all = false;
          const need_revalidate_workspace_visibility =
            this.options.hideEmptyWorkspaces &&
            this.options.showWorkspaceTree &&
            this._analyzedWhere &&
            Object.keys(this._analyzedWhere.assetWhereWithoutWorkspace).length >
              0;

          const ask_revalidate_workspace_for_asset_id = (asset_id) => {
            if (!this.options.showWorkspaceTree) {
              return;
            }
            const visible_workspace_id =
              this.findWorkspaceOwnerForVisibilityRevalidate(
                `asset:${asset_id}`,
              );
            if (visible_workspace_id) {
              revalidate_visibility_workspace_ids.add(visible_workspace_id);
            } else {
              revalidate_visibility_of_all = true;
            }
          };

          // Process deleted assets
          if (change_res.deletedIds.length > 0) {
            for (const asset_id of change_res.deletedIds) {
              if (need_revalidate_workspace_visibility) {
                ask_revalidate_workspace_for_asset_id(asset_id);
              }
              this.deleteItemInState(`asset:${asset_id}`);
            }
          }

          // Handle insert & update
          if (change_res.upsert.ids.length > 0) {
            const upserted_assets = (
              await Promise.all(
                change_res.upsert.ids.map((id) => {
                  return this.appManager
                    .get(CreatorAssetManager)
                    .getAssetShortViaCache(id);
                }),
              )
            ).filter((x) => x) as AssetShort[];

            const matched_assets = await this.appManager
              .get(CreatorAssetManager)
              .matchAssetShortsWithWhere(
                upserted_assets,
                this.options.assetWhere,
              );

            if (matched_assets.length !== upserted_assets.length) {
              const matched_asset_id_set = new Set(
                matched_assets.map((a) => a.id),
              );
              for (const asset of upserted_assets) {
                if (!matched_asset_id_set.has(asset.id)) {
                  if (need_revalidate_workspace_visibility) {
                    ask_revalidate_workspace_for_asset_id(asset.id);
                  }
                  this.deleteItemInState(`asset:${asset.id}`);
                }
              }
            }

            const states_to_be_reorder = new Set<
              TreePresenterNodeState<ProjectTreeItemPayload>
            >();

            for (const asset of matched_assets) {
              if (this.options.showWorkspaceTree) {
                await this._ensureWorkspacePathExists(asset.workspaceId);
              }
              const old_owner_state = this.findOwnerState(`asset:${asset.id}`);
              const new_owner_id =
                this.options.showWorkspaceTree &&
                !this.isRootWorkspaceId(asset.workspaceId)
                  ? `workspace:${asset.workspaceId}`
                  : '';
              const new_owner_state = this.getState(new_owner_id);
              let new_owner_state_reorder = false;
              if (old_owner_state) {
                const old_item =
                  old_owner_state.state.children[old_owner_state.index];
                if (old_owner_state.state.id !== new_owner_id) {
                  if (need_revalidate_workspace_visibility) {
                    ask_revalidate_workspace_for_asset_id(asset.id);
                  }
                  old_owner_state.state.children.splice(
                    old_owner_state.index,
                    1,
                  );
                } else {
                  if (old_item.title !== asset.title) {
                    new_owner_state_reorder = true;
                    old_item.title = asset.title ?? '';
                  }
                  if (old_item.payload.index !== asset.index) {
                    new_owner_state_reorder = true;
                    old_item.payload.index = asset.index;
                  }
                }
              } else {
                if (need_revalidate_workspace_visibility) {
                  revalidate_visibility_of_all = true;
                }
              }
              if (
                !old_owner_state ||
                old_owner_state.state.id !== new_owner_id
              ) {
                if (new_owner_state && new_owner_state.expanded) {
                  new_owner_state.children.push(
                    this.makeItemForAssetShort(asset),
                  );
                  new_owner_state_reorder = true;
                }
              }
              if (new_owner_state_reorder && new_owner_state) {
                states_to_be_reorder.add(new_owner_state);
              }
            }

            if (states_to_be_reorder.size > 0) {
              for (const state of states_to_be_reorder) {
                this.reorderStateChildren(state);
              }
            }
          }

          // Revalidate visible workspaces
          if (need_revalidate_workspace_visibility) {
            if (revalidate_visibility_of_all) {
              revalidate_visibility_workspace_ids = new Set(
                this._getAllVisibleWorkspaceIds(),
              );
            }

            if (revalidate_visibility_workspace_ids.size > 0) {
              await this._revalidateWorkspaceVisibility([
                ...revalidate_visibility_workspace_ids,
              ]);
            }
          }
        } catch (err: any) {
          console.error(
            'ProjectTreePresenterVM: failed handle asset events',
            err,
          );
        }
      },
    );
    await this._externalUpdateByEventTask;
  }

  protected async handleWorkspacesEvents(
    change_res: CreatorWorkspaceEventsArg,
  ) {
    this._externalUpdateByEventTask = this._externalUpdateByEventTask.then(
      async () => {
        try {
          if (this._analyzedWhere && this._analyzedWhere.isSystem) {
            return;
          }

          for (const asset_id of change_res.deletedIds) {
            this.deleteItemInState(`workspace:${asset_id}`);
          }

          if (!this.options.showWorkspaceTree) {
            return;
          }

          const states_to_be_reorder = new Set<
            TreePresenterNodeState<ProjectTreeItemPayload>
          >();

          for (const workspace of change_res.upsert) {
            const old_owner_state = this.findOwnerState(
              `workspace:${workspace.id}`,
            );
            const new_owner_id = !this.isRootWorkspaceId(workspace.parentId)
              ? `workspace:${workspace.parentId}`
              : '';

            const new_owner_state = this.getState(new_owner_id);
            let new_owner_state_reorder = false;
            if (old_owner_state) {
              const old_item =
                old_owner_state.state.children[old_owner_state.index];
              if (old_owner_state.state.id !== new_owner_id) {
                old_owner_state.state.children.splice(old_owner_state.index, 1);
              } else {
                if (old_item.title !== workspace.title) {
                  new_owner_state_reorder = true;
                  old_item.title = workspace.title ?? '';
                }
                if (old_item.payload.index !== workspace.index) {
                  new_owner_state_reorder = true;
                  old_item.payload.index = workspace.index;
                }
              }
            }
            if (!old_owner_state || old_owner_state.state.id !== new_owner_id) {
              if (new_owner_state && new_owner_state.expanded) {
                new_owner_state.children.push(
                  this.makeItemForWorkspace(workspace),
                );
                new_owner_state_reorder = true;
              }
            }
            if (new_owner_state_reorder && new_owner_state) {
              states_to_be_reorder.add(new_owner_state);
            }
          }
          if (states_to_be_reorder.size > 0) {
            for (const state of states_to_be_reorder) {
              this.reorderStateChildren(state);
            }
          }
        } catch (err: any) {
          console.error(
            'ProjectTreePresenterVM: failed handle wprkspace events',
            err,
          );
        }
      },
    );
    await this._externalUpdateByEventTask;
  }

  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      _analyzedWhere: this._analyzedWhere,
      _loadedHiddenNonAlternativeIds: this._loadedHiddenNonAlternativeIds,
      _loadedForProjectId: this._loadedForProjectId,
    };
  }

  override loadJSON(data: Record<string, any>): void {
    super.loadJSON(data);
    this._analyzedWhere = data._analyzedWhere;
    this._loadedHiddenNonAlternativeIds = data._loadedHiddenNonAlternativeIds;
    this._loadedForProjectId = data._loadedForProjectId;
  }
}
