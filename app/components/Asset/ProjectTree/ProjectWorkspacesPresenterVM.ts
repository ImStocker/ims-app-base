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
  type CreatorWorkspaceEventsArg,
} from '../../../logic/managers/CreatorAssetManager';
import { intersectObjectArrays } from '../../../logic/utils/array';
import type { AssetForSelection } from '../../../logic/types/AssetsType';
import type { SubscriberHandler } from '../../../logic/types/Subscriber';
import { escapeRegExp } from '../../../logic/utils/stringUtils';
import { convertTranslatedTitle } from '../../../logic/utils/assets';
import {
  ProjectTreePresenterBaseVM,
  type ProjectTreeItemPayload,
} from './ProjectTreePresenterBaseVM';
import ProjectManager from '../../../logic/managers/ProjectManager';

export type ProjectWorkspacesPresenterVMOptions = {
  workspaceWhere: WorkspaceQueryDTOWhere;
  allowDragChange: boolean;
  additionalOptions: AssetForSelection[];
};

export function getDefaultProjectWorkspacesPresenterVMOptions(): ProjectWorkspacesPresenterVMOptions {
  return {
    workspaceWhere: {},
    allowDragChange: false,
    additionalOptions: [],
  };
}

type ProjectWorkspacesPresenterAnalyzedWhere = {
  willFindNothing: boolean;
  rootWorkspaces: Workspace[];
  rootWorkspacesStrict: boolean;
  workspaceWhereSubSearch: WorkspaceQueryDTOWhere;
  query: string | undefined;
  isSystem: boolean | undefined;
};

export class ProjectWorkspacesPresenterVM extends ProjectTreePresenterBaseVM {
  private _reloadSubscriber: SubscriberHandler | null = null;
  private _workspaceEventsSubscriber: SubscriberHandler | null = null;
  private _analyzedWhere: ProjectWorkspacesPresenterAnalyzedWhere | null = null;
  private _options: ProjectWorkspacesPresenterVMOptions;
  private _externalUpdateByEventTask = Promise.resolve();
  private _loadedForProjectId: string | null = null;
  private _changeProjectSubscriber: SubscriberHandler | null = null;

  private _inited: boolean = false;

  get inited() {
    return this._inited;
  }

  public constructor(
    appManager: IAppManager,
    options: ProjectWorkspacesPresenterVMOptions = getDefaultProjectWorkspacesPresenterVMOptions(),
  ) {
    super(appManager);
    this._options = options;
  }

  public get options(): ProjectWorkspacesPresenterVMOptions {
    return this._options;
  }

  public setOptions(set: Partial<ProjectWorkspacesPresenterVMOptions>) {
    let need_reload = false;
    if (
      set.workspaceWhere !== undefined &&
      JSON.stringify(set.workspaceWhere) !==
        JSON.stringify(this._options.workspaceWhere)
    ) {
      this._options.workspaceWhere = set.workspaceWhere;
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
      set.allowDragChange !== undefined &&
      set.allowDragChange !== this._options.allowDragChange
    ) {
      this._options.allowDragChange = set.allowDragChange;
    }
    if (need_reload) {
      this.forgetChildren(TREE_PRESENTER_ROOT_STATE_ID);
    }
  }

  private async _analyzeWhere(): Promise<ProjectWorkspacesPresenterAnalyzedWhere> {
    if (this._analyzedWhere) {
      return this._analyzedWhere;
    }
    let willFindNothing = false;
    let rootWorkspaces: Workspace[] = [];
    let rootWorkspacesStrict = false;
    let query: string | undefined = undefined;
    let isSystem: boolean | undefined = undefined;

    const process_key_val = async (
      key: keyof WorkspaceQueryDTOWhere,
      val: any,
    ) => {
      let skip_key = false;

      if (key === 'query' && typeof val === 'string') {
        query = val;
        skip_key = true;
      }

      if (key === 'isSystem' && typeof val === 'boolean') {
        isSystem = val;
        skip_key = true;
      }

      if (key === 'parentId' || key === 'insideId') {
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
          case 'parentId':
            workspace_ids = val_arr;
            break;
          case 'insideId':
            workspace_ids = val_arr;
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
    };

    const process_where = async (
      where: WorkspaceQueryDTOWhere,
    ): Promise<WorkspaceQueryDTOWhere> => {
      const new_where: WorkspaceQueryDTOWhere = {};
      for (const [key, val] of Object.entries(where) as [
        keyof WorkspaceQueryDTOWhere,
        any,
      ][]) {
        if (val === undefined) {
          continue;
        }

        const skip_key = await process_key_val(key, val);
        if (!skip_key) {
          new_where[key] = val;
        }
      }
      return new_where;
    };

    const workspaceWhereSubSearch = await process_where(
      this.options.workspaceWhere,
    );

    this._analyzedWhere = {
      willFindNothing,
      rootWorkspaces,
      rootWorkspacesStrict,
      workspaceWhereSubSearch: workspaceWhereSubSearch,
      query,
      isSystem,
    };
    return this._analyzedWhere;
  }

  private async _loadWorkspaceSubTree(
    analyzed_where: ProjectWorkspacesPresenterAnalyzedWhere,
    parent_workspace_id: string | null | undefined,
  ): Promise<{
    workspaces: Workspace[];
    rootWorkspaceId: null | string | undefined;
  }> {
    let found_workspaces: Workspace[] = [];

    if (parent_workspace_id) {
      found_workspaces = (
        await this.appManager.get(CreatorAssetManager).getWorkspacesListAll({
          where: {
            ...analyzed_where.workspaceWhereSubSearch,
            parentId: parent_workspace_id,
            isSystem: analyzed_where.isSystem,
          },
        })
      ).list;
    } else {
      if (!analyzed_where.query) {
        const workspace_where: WorkspaceQueryDTOWhere = {
          isSystem: analyzed_where.isSystem,
        };
        if (analyzed_where.rootWorkspaces.length > 0) {
          workspace_where.ids = analyzed_where.rootWorkspaces.map((w) => w.id);
        } else {
          workspace_where.isRoot = true;
        }
        found_workspaces = (
          await this.appManager.get(CreatorAssetManager).getWorkspacesListAll({
            where: workspace_where,
          })
        ).list;
      } else {
        found_workspaces = (
          await this.appManager.get(CreatorAssetManager).getWorkspacesListAll({
            where: {
              ...analyzed_where.workspaceWhereSubSearch,
              query: analyzed_where.query,
              isSystem: analyzed_where.isSystem,
            },
          })
        ).list;
      }
    }
    return {
      workspaces: found_workspaces,
      rootWorkspaceId: parent_workspace_id,
    };
  }

  protected override async loadChildrenImpl(
    item: TreePresenterItem<ProjectTreeItemPayload> | null,
  ): Promise<TreePresenterItem<ProjectTreeItemPayload>[]> {
    await this._externalUpdateByEventTask; // Wait for hadling external updates
    const project_info = this.appManager.get(ProjectManager).getProjectInfo();
    this._loadedForProjectId = project_info ? project_info.id : null;

    let found_workspaces: Workspace[] = [];
    let found_additional: AssetForSelection[] = [];

    const analyzed_where = await this._analyzeWhere();
    if (!analyzed_where.willFindNothing) {
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
      );
      found_workspaces = found.workspaces;
      if (!item) {
        this.loadedRootWorkspaceId = found.rootWorkspaceId;
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
      ...found_workspaces.map((w) => {
        return this.makeItemForWorkspace(w);
      }),
      ...found_additional.map((ao, index) => {
        return this.makeItemForAdditional(ao, index);
      }),
    ];
  }

  protected override get isDragDropAllowed() {
    return this.options.allowDragChange && !this._analyzedWhere?.query;
  }

  private _resetInit(init: boolean) {
    if (this._reloadSubscriber) {
      this._reloadSubscriber.unsubscribe();
      this._reloadSubscriber = null;
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
            changes.workspaceId ? 'workspace:' + changes.workspaceId : '',
          );
        });
      this._workspaceEventsSubscriber = this.appManager
        .get(CreatorAssetManager)
        .workspaceEvents.subscribe((change_res) => {
          // Don't await
          this._handleWorkspacesEvents(change_res);
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

  private async _handleWorkspacesEvents(change_res: CreatorWorkspaceEventsArg) {
    this._externalUpdateByEventTask = this._externalUpdateByEventTask.then(
      async () => {
        try {
          for (const asset_id of change_res.deletedIds) {
            this.deleteItemInState(`workspace:${asset_id}`);
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
      _loadedForProjectId: this._loadedForProjectId,
    };
  }

  override loadJSON(data: Record<string, any>): void {
    super.loadJSON(data);
    this._analyzedWhere = data._analyzedWhere;
    this._loadedForProjectId = data._loadedForProjectId;
  }
}
