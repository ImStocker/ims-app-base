import { AppSubManagerBase, type IAppManager } from './IAppManager';
import ApiManager from './ApiManager';
import {
  type AssetShort,
  type AssetsFullResult,
  type AssetQueryWhere,
  type AssetCreateDTO,
  type AssetWhereParams,
  type AssetsGraph,
  type CreateRefDTO,
  type AssetBlockParamsDTO,
  type AssetChangeDTO,
  type AssetDeleteResultDTO,
  type AssetReferencesResult,
  type AssetChangeContent,
  type AssetSetDTO,
  createEmptyAssetFullResult,
  type AssetPreviewInfo,
  type AssetsChangeResult,
  type AssetMoveResult,
  type AssetFull,
  type AssetMoveParams,
  type AssetsBatchChangeResultDTO,
  type AssetChangeBatchOpDTO,
  type AssetForEdit,
} from '../types/AssetsType';
import {
  WORKSPACE_TYPE_COLLECTION,
  WORKSPACE_TYPE_TASKBOARD,
  type ChangeWorkspaceRequest,
  type Workspace,
  type WorkspaceMoveParams,
  type WorkspaceMoveResult,
  type WorkspaceQueryDTOWhere,
} from '../types/Workspaces';
import type {
  ApiRequestList,
  ApiResultListWithMore,
  ApiResultListWithTotal,
  ProjectFullInfo,
} from '../types/ProjectTypes';
import { EntityCache } from '../types/EntityCache';
import {
  AssetFullInstance,
  type AssetFullInstanceR,
} from '../types/AssetFullInstance';
import {
  assignPlainValueToAssetProps,
  convertAssetPropsToPlainObject,
  normalizeAssetPropPart,
  stringifyAssetNewBlockRef,
  type AssetProps,
  type AssetPropsPlainObject,
} from '../types/Props';
import {
  MIN_ASSET_RIGHTS_TO_CHANGE,
  MIN_ASSET_RIGHTS_TO_DELETE,
  MIN_ASSET_RIGHTS_TO_RENAME,
  MIN_WORKSPACE_RIGHTS_TO_DELETE,
  MIN_WORKSPACE_RIGHTS_TO_READ,
} from '../types/Rights';
import { assert } from '../utils/typeUtils';
import ProjectManager from './ProjectManager';
import type {
  AssetGlobalHistoryResultDTO,
  AssetHistoryDTO,
} from '../types/AssetHistory';
import Subscriber from '../types/Subscriber';
import type { AssetPropsSelection } from '../types/PropsSelection';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
  type AssetPropWhereCondition,
  type AssetPropWhereOp,
} from '../types/PropsWhere';
import type {
  IProjectDatabase,
  ProjectContentChangeEventArg,
} from '../types/IProjectDatabase';
import { Service, HttpMethods } from './ApiWorker';
import { BLOCK_NAME_META, TASK_COLUMNS_ID } from '../constants';
import { convertTranslatedTitle } from '../utils/assets';
import {
  type WorkspaceCollectionColumn,
  gatherColumns,
} from '../../components/GameDesign/WorkspaceCollectionContent';
import isUUID from 'validator/es/lib/isUUID';
import { ViewType } from '../../components/Workspace/ViewOptions/viewUtils';
import { ProjectContentExternalListener } from './ProjectContent/ProjectContentExternalListener';
import AuthManager from './AuthManager';

export type CreatorsAssetMultipleChangeResult = {
  upsert: AssetsFullResult;
  deletedIds: string[];
  changeIds: string[];
  touchedWIds: string[];
};

type AssetHasChildrenRecord = {
  id: string;
  hasChildren: boolean;
};

export default class CreatorAssetManager extends AppSubManagerBase {
  private readonly _apiManager: ApiManager;
  private _shortAssetsCache: EntityCache<AssetShort> | undefined;
  private _previewAssetsCache: EntityCache<AssetPreviewInfo> | undefined;
  private _hasChildrenAssetsCache:
    | EntityCache<AssetHasChildrenRecord>
    | undefined;
  private _fullAssetsCache: EntityCache<AssetFullInstanceR> | undefined;
  private _workspacesCache: EntityCache<Workspace> | undefined;
  protected _projectDatabase: IProjectDatabase | undefined;
  private _watchExternalEvents: boolean = false;
  private _externalContentListener: ProjectContentExternalListener | null =
    null;

  reloadSubscriber = new Subscriber<[{ workspaceId?: string | null }]>();

  projectContentEvents = new Subscriber<[ProjectContentChangeEventArg]>();

  constructor(app_manager: IAppManager) {
    super(app_manager);
    this._apiManager = app_manager.get(ApiManager);
  }

  async init(database: IProjectDatabase, watchExternalEvents: boolean) {
    this._projectDatabase = database;
    this._watchExternalEvents = watchExternalEvents;
    this._shortAssetsCache = new EntityCache<AssetShort>({
      key: 'id',
      ttl: 1000 * 60 * 10,
      loadFunc: async (assetIds) => {
        const res = await this.getAssetShortsList({ where: { id: assetIds } });
        return res.list;
      },
    });
    this._fullAssetsCache = new EntityCache<AssetFullInstanceR>({
      key: 'id',
      ttl: 1000 * 60 * 10,
      loadFunc: async (assetIds) => {
        const res = await this.getAssetInstancesList({
          where: { id: assetIds },
        });
        return res.list;
      },
    });
    this._previewAssetsCache = new EntityCache<AssetPreviewInfo>({
      key: 'id',
      ttl: 1000 * 60 * 10,
      loadFunc: async (assetIds) => {
        const res = await this.getAssetPreviewList({ where: { id: assetIds } });
        return res.list;
      },
    });
    this._workspacesCache = new EntityCache<Workspace>({
      key: 'id',
      ttl: 1000 * 60 * 10,
      loadFunc: async (workspaceIds) => {
        const res = await this.getWorkspacesList({
          where: { ids: workspaceIds },
        });
        return res.list;
      },
    });
    this._hasChildrenAssetsCache = new EntityCache<AssetHasChildrenRecord>({
      key: 'id',
      ttl: 1000 * 60 * 1,
      loadFunc: async (assetIds) => {
        assert(this._hasChildrenAssetsCache);
        const list: AssetHasChildrenRecord[] = [];
        for (const assetId of assetIds) {
          const res = await this.getAssetsView<{ id: string }>({
            select: ['id'],
            where: {
              typeids: assetId,
            },
          });
          const record: AssetHasChildrenRecord = {
            id: assetId,
            hasChildren: res.total > 0,
          };
          this._hasChildrenAssetsCache.addToCache(record);
          list.push(record);
        }
        return list;
      },
    });
  }

  currentProjectUnload() {
    assert(this._shortAssetsCache, 'Not inited');
    assert(this._fullAssetsCache, 'Not inited');
    assert(this._previewAssetsCache, 'Not inited');
    assert(this._workspacesCache, 'Not inited');
    this._shortAssetsCache.reset();
    this._fullAssetsCache.reset();
    this._previewAssetsCache.reset();
    this._workspacesCache.reset();
    if (this._externalContentListener) {
      this._externalContentListener.destroy();
      this._externalContentListener = null;
    }
  }

  initForProject(project: ProjectFullInfo | null) {
    if (project && this._watchExternalEvents && this._projectDatabase) {
      const projectRole = this.appManager
        .get(ProjectManager)
        .getUserRoleInProject();
      if (projectRole) {
        this._externalContentListener = new ProjectContentExternalListener(
          this,
          this._projectDatabase,
          project.id,
          this._getCurrentUserInstigator(),
        );
        this._externalContentListener.init();
        this._externalContentListener.listenWorkpaceIds(
          project.rootWorkspaces.map((w) => w.id),
        );
      }
    }
  }

  private _getCurrentUserInstigator(): number | null {
    const user = this.appManager.get(AuthManager).getUserInfo();
    return user?.id ?? null;
  }

  //WORKSPACES

  async getWorkspacesList(
    query: ApiRequestList<WorkspaceQueryDTOWhere>,
  ): Promise<ApiResultListWithTotal<Workspace>> {
    assert(this._workspacesCache, 'Not inited');
    assert(this._projectDatabase, 'Not inited');
    const res = await this._projectDatabase.workspacesGet(query);
    this.updateWorkspacesCache(res.list);
    return res;
  }

  async getWorkspacesListAll(
    query: ApiRequestList<WorkspaceQueryDTOWhere>,
  ): Promise<ApiResultListWithTotal<Workspace>> {
    const res = await this.getWorkspacesList(query);
    let has_more = res.total > res.list.length;
    let next_offset = res.list.length;
    while (has_more) {
      const chunk_query = {
        ...query,
        offset: next_offset,
      };
      const chunk = await this.getWorkspacesList(chunk_query);
      if (chunk.list.length === 0) break;
      next_offset += chunk.list.length;
      res.list = [...res.list, ...chunk.list];
      has_more = res.total > res.list.length;
    }
    res.total = res.list.length;
    return res;
  }

  async getWorkspaceById(workspace_id: string): Promise<Workspace | null> {
    const workspaces = await this.getWorkspacesList({
      where: { ids: [workspace_id] },
    });
    return workspaces.list.length > 0 ? workspaces.list[0] : null;
  }

  async createWorkspace(params: ChangeWorkspaceRequest): Promise<Workspace> {
    assert(this._workspacesCache, 'Not inited');
    assert(this._projectDatabase, 'Not inited');
    let workspace_params = { ...params };
    if (params.props?.type === WORKSPACE_TYPE_COLLECTION) {
      const parent_workspace = params.parentId
        ? await this.getWorkspaceById(params.parentId)
        : null;
      if (
        parent_workspace &&
        parent_workspace.props.type === WORKSPACE_TYPE_COLLECTION
      ) {
        workspace_params = {
          ...workspace_params,
          props: {
            ...(parent_workspace.props ?? {}),
          },
        };
      } else {
        let columns: WorkspaceCollectionColumn[] = [
          {
            name: 'title',
            differentDefinition: false,
            index: 0,
            multiple: false,
            params: {},
            propKey: 'title',
            propTitle: 'Title',
            type: 'collectionAssetTitle',
            pin: 'left',
            blockRef: '',
            width: 200,
            propName: '',
          },
        ];

        const base_asset = (params.props?.asset as any)?.AssetId
          ? await this.getAssetInstance(
              (params.props?.asset as any)?.AssetId as string,
            )
          : null;
        if (base_asset) {
          columns = [...columns, ...gatherColumns(base_asset, this.appManager)];
        }
        const new_view = {
          title: convertTranslatedTitle('[[t:Table]]', (key) =>
            this.appManager.$t(key),
          ),
          type: ViewType.TABLE,
        };
        const new_view_key = normalizeAssetPropPart(new_view.title);
        const views_map = {
          views: {
            [new_view_key]: {
              ...new_view,
              index: 0,
              key: new_view_key,
              sort: [],
              filter: [],
              props: columns.map((col) => {
                return {
                  prop: col.propKey,
                  width: null,
                };
              }),
            },
          },
        };
        workspace_params = {
          ...workspace_params,
          props: {
            ...(workspace_params.props ?? {}),
            ...assignPlainValueToAssetProps({}, views_map),
          },
        };
      }
    } else if (params.props?.type === WORKSPACE_TYPE_TASKBOARD) {
      const task_columns_asset = await this.appManager
        .get(CreatorAssetManager)
        .getAssetInstance(TASK_COLUMNS_ID);
      const props: AssetPropsPlainObject = {};
      if (task_columns_asset) {
        const info_block = task_columns_asset?.blocks.find(
          (block) => block.name === 'info',
        );
        const task_columns: {
          items: {
            name?: string;
            title: string;
            index?: number;
          }[];
        } = info_block?.computed
          ? convertAssetPropsToPlainObject(info_block?.computed)
          : { items: [] };
        if (task_columns.items) {
          for (const item of task_columns.items) {
            props[item.name ?? normalizeAssetPropPart(item.title)] = {
              title: item.title,
              index:
                item.index ??
                Math.max(
                  ...task_columns.items
                    .filter((item) => item)
                    .map((item) => item.index ?? 0),
                ) + 1,
            };
          }
        }
      }
      workspace_params = {
        ...workspace_params,
        props: {
          ...(workspace_params.props ?? {}),
          type: 'taskboard',
          ...assignPlainValueToAssetProps({}, props, 'columns'),
        },
      };
    }
    const res = await this._expectMyEvents(
      () => {
        return this._projectDatabase!.workspacesCreate(workspace_params);
      },
      (res) => {
        const workspaceIds = [res.id];
        if (res.parentId) workspaceIds.push(res.parentId);
        return {
          assetIds: [],
          workspaceIds,
        };
      },
    );
    this._workspacesCache.addToCache(res);
    await this.projectContentEvents.notify({
      aDelIds: [],
      aUpsIds: [],
      wUpsIds: [res.id],
      wTchIds: res.parentId ? [res.parentId] : [],
      wDelIds: [],
      instigator: this._getCurrentUserInstigator(),
    });
    return res;
  }

  private async _expectMyEvents<T>(
    callback: () => T | Promise<T>,
    expect: (res: T) => { assetIds: string[]; workspaceIds: string[] },
  ) {
    if (this._externalContentListener) {
      return await this._externalContentListener.expectMyEvents(
        callback,
        expect,
      );
    } else return await callback();
  }

  async changeWorkspace(
    workspace_id: string,
    params: ChangeWorkspaceRequest,
  ): Promise<Workspace> {
    assert(this._workspacesCache, 'Not inited');
    assert(this._projectDatabase, 'Not inited');
    const old_parent_id =
      this._workspacesCache.getElementSync(workspace_id)?.parentId ?? null;

    const res = await this._expectMyEvents(
      () => {
        return this._projectDatabase!.workspacesChange(workspace_id, params);
      },
      (res) => {
        const workspaceIds = [res.id];
        if (params.parentId && old_parent_id !== res.parentId) {
          if (old_parent_id) workspaceIds.push(old_parent_id);
          if (res.parentId) workspaceIds.push(res.parentId);
        }
        return {
          assetIds: [],
          workspaceIds,
        };
      },
    );

    this._workspacesCache.addToCache(res);
    const workspacesContentIds: string[] = [];
    if (params.parentId && old_parent_id !== res.parentId) {
      if (old_parent_id) workspacesContentIds.push(old_parent_id);
      if (res.parentId) workspacesContentIds.push(res.parentId);
    }
    await this.projectContentEvents.notify({
      aUpsIds: [],
      aDelIds: [],
      wUpsIds: [res.id],
      wDelIds: [],
      wTchIds: workspacesContentIds,
      instigator: this._getCurrentUserInstigator(),
    });
    return res;
  }

  async deleteWorkspace(workspace_id: string): Promise<void> {
    assert(this._workspacesCache, 'Not inited');
    assert(this._projectDatabase, 'Not inited');
    const old_parent_id =
      this._workspacesCache.getElementSync(workspace_id)?.parentId ?? null;

    await this._expectMyEvents(
      async () => {
        await this._projectDatabase!.workspacesDelete(workspace_id);
      },
      () => {
        const workspaceIds = [workspace_id];
        if (old_parent_id) {
          workspaceIds.push(old_parent_id);
        }
        return {
          assetIds: [],
          workspaceIds,
        };
      },
    );

    this._workspacesCache.setNotFoundKeys([workspace_id]);
    const workspacesContentIds: string[] = [];
    if (old_parent_id) workspacesContentIds.push(old_parent_id);
    await this.projectContentEvents.notify({
      aUpsIds: [],
      aDelIds: [],
      wUpsIds: [],
      wDelIds: [workspace_id],
      wTchIds: workspacesContentIds,
      instigator: this._getCurrentUserInstigator(),
    });
  }

  canDeleteWorkspace(workspace: Workspace) {
    return workspace.rights === MIN_WORKSPACE_RIGHTS_TO_DELETE;
  }

  canReadWorkspace(workspace: Workspace) {
    return workspace.rights === MIN_WORKSPACE_RIGHTS_TO_READ;
  }

  getWorkspaceByNameViaCacheSync(workspace_name: string, checkValid = true) {
    assert(this._workspacesCache, 'Not inited');
    return this._workspacesCache.findElementSync(
      (w: Workspace) => w.name === workspace_name,
      checkValid,
    );
  }

  getWorkspaceByTypeViaCacheSync(workspace_prop: string, checkValid = true) {
    assert(this._workspacesCache, 'Not inited');
    return this._workspacesCache.findElementSync(
      (w: Workspace) => w.props?.type === workspace_prop,
      checkValid,
    );
  }

  async requestWorkspaceInCacheByNames(
    workspaceNames: string[],
  ): Promise<void> {
    await this.getWorkspacesList({
      where: {
        names: workspaceNames,
        isSystem: false,
      },
    });
  }

  async getWorkspaceByNameViaCache(workspace_name: string) {
    const workspace_in_cache =
      this.getWorkspaceByNameViaCacheSync(workspace_name);
    if (!workspace_in_cache) {
      const res = await this.getWorkspacesList({
        where: {
          names: [workspace_name],
          isSystem: false,
        },
      });
      return res && res.list.length > 0 ? res.list[0] : null;
    } else {
      return workspace_in_cache;
    }
  }

  getWorkspaceByIdViaCacheSync(workspace_id: string) {
    assert(this._workspacesCache, 'Not inited');
    return this._workspacesCache.getElementSync(workspace_id);
  }

  async getWorkspaceByIdViaCache(workspace_id: string) {
    assert(this._workspacesCache, 'Not inited');
    return this._workspacesCache.getElement(workspace_id);
  }

  async getWorkspaceListByIdsViaCache(workspace_ids: string[]) {
    const workspace_cache = this._workspacesCache;
    assert(workspace_cache, 'Not inited');
    return Promise.all(
      workspace_ids.map((workspace_id) =>
        workspace_cache.getElement(workspace_id),
      ),
    );
  }
  //ASSETS

  getAssetShortViaCacheSync(
    assetId: string,
    checkValid = false,
  ): AssetShort | null | undefined {
    assert(this._shortAssetsCache, 'Not inited');
    return this._shortAssetsCache.getElementSync(assetId, checkValid);
  }

  async getAssetShortViaCache(assetId: string): Promise<AssetShort | null> {
    assert(this._shortAssetsCache, 'Not inited');
    return this._shortAssetsCache.getElement(assetId);
  }

  getAssetShortByNameViaCacheSync(asset_name: string, checkValid = true) {
    assert(this._shortAssetsCache, 'Not inited');
    return this._shortAssetsCache.findElementSync(
      (a: AssetShort) => a.name === asset_name,
      checkValid,
    );
  }

  getAssetShortByTitleViaCacheSync(asset_title: string, checkValid = true) {
    assert(this._shortAssetsCache, 'Not inited');
    return this._shortAssetsCache.findElementSync(
      (a: AssetShort) => a.title === asset_title,
      checkValid,
    );
  }

  async requestAssetShortInCacheByNames(asset_names: string[]): Promise<void> {
    await this.getAssetShortsList({
      where: {
        names: asset_names,
        isSystem: false,
      },
    });
  }

  async getAssetShortByNameViaCache(asset_name: string) {
    const asset_in_cache = this.getAssetShortByNameViaCacheSync(asset_name);
    if (!asset_in_cache) {
      const res = await this.getAssetShortsList({
        where: {
          names: [asset_name],
          isSystem: false,
        },
      });
      return res && res.list.length > 0 ? res.list[0] : null;
    } else {
      return asset_in_cache;
    }
  }

  getAssetShortCacheTime(assetId: string): number | undefined {
    assert(this._shortAssetsCache, 'Not inited');
    return this._shortAssetsCache.getElementTime(assetId);
  }

  getAssetPreviewViaCacheSync(
    assetId: string,
    checkValid = false,
  ): AssetPreviewInfo | null | undefined {
    assert(this._previewAssetsCache, 'Not inited');
    return this._previewAssetsCache.getElementSync(assetId, checkValid);
  }

  async getAssetPreviewViaCache(
    assetId: string,
  ): Promise<AssetPreviewInfo | null> {
    assert(this._previewAssetsCache, 'Not inited');
    return this._previewAssetsCache.getElement(assetId);
  }

  getAssetInstanceViaCacheSync(
    assetId: string,
  ): AssetFullInstanceR | null | undefined {
    assert(this._fullAssetsCache, 'Not inited');
    return this._fullAssetsCache.getElementSync(assetId);
  }

  async getAssetInstance(
    assetId: string,
    refresh = false,
  ): Promise<AssetFullInstanceR | null> {
    assert(this._fullAssetsCache, 'Not inited');
    if (refresh) {
      const refresh_res = await this.getAssetInstancesList({
        where: {
          id: [assetId],
        },
      });
      if (refresh_res.list.length === 0) {
        this._fullAssetsCache.setNotFoundKeys([assetId]);
        return null;
      }
    }
    return this._fullAssetsCache.getElement(assetId);
  }

  async requestAssetShortInCache(assetId: string): Promise<void> {
    if (!assetId) return;
    await this.getAssetShortViaCache(assetId);
  }

  async requestAssetShortInCacheList(assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }
    await Promise.all(
      assetIds.map((assetId) => this.getAssetShortViaCache(assetId)),
    );
  }

  async requestAssetPreviewInCache(assetId: string): Promise<void> {
    if (!assetId) return;
    await this.getAssetPreviewViaCache(assetId);
  }

  async requestAssetPreviewInCacheList(assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }
    await Promise.all(
      assetIds.map((assetId) => this.getAssetPreviewViaCache(assetId)),
    );
  }

  async requestAssetInstanceInCache(assetId: string): Promise<void> {
    if (!assetId) return;
    await this.getAssetInstance(assetId);
  }

  async requestWorkspaceInCache(workspaceId: string): Promise<void> {
    if (!workspaceId) return;
    await this.getWorkspaceByIdViaCache(workspaceId);
  }

  async getAssetShortsList(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<ApiResultListWithTotal<AssetShort>> {
    assert(this._shortAssetsCache, 'Not inited');
    assert(this._workspacesCache, 'Not inited');
    assert(this._projectDatabase, 'Not inited');
    const res = await this._projectDatabase.assetsGetShort(query);
    this.updateShortAssetsCache(res.list);
    this.updateWorkspacesCache(Object.values(res.objects.workspaces));
    return res;
  }

  async getAssetPreviewList(query: ApiRequestList<AssetQueryWhere>) {
    assert(this._previewAssetsCache, 'Not inited');
    assert(this._projectDatabase, 'Not inited');
    const res = await this.getAssetsView<AssetPreviewInfo>(
      {
        ...query,
        select: [
          'id',
          'title',
          'name',
          'icon',
          'isAbstract',
          'rights',
          { prop: 'gallery|main', as: 'mainImage' },
          { prop: 'description|value', as: 'description' },
          { prop: BLOCK_NAME_META + '|complete_track', as: 'completeTrack' },
          { prop: BLOCK_NAME_META + '|complete_set', as: 'completeSet' },
          {
            prop: BLOCK_NAME_META + '|complete_progress',
            as: 'completeProgress',
          },
          {
            prop: BLOCK_NAME_META + '|plan_milestone',
            as: 'planMilestone',
          },
        ],
      },
      {
        folded: true,
      },
    );
    this._previewAssetsCache.addToCacheMany(res.list);
    return res;
  }

  updateFullInstancesCache(asset_fulls: AssetFull[], request_listen = true) {
    assert(this._shortAssetsCache, 'Not inited');
    assert(this._fullAssetsCache, 'Not inited');
    assert(this._hasChildrenAssetsCache, 'Not inited');
    assert(this._previewAssetsCache, 'Not inited');
    for (const asset of asset_fulls) {
      let instance = this._fullAssetsCache.getElementSync(asset.id);
      if (instance) {
        instance.update(asset);
        this._fullAssetsCache.touchInCache(asset.id);
      } else {
        instance = AssetFullInstance.Create(this.appManager, asset);
        this._fullAssetsCache.addToCache(instance);
      }
      const short = instance.convertToShort();
      this._shortAssetsCache.addToCache(short);
      const preview = instance.convertToPreviewInfo();
      this._previewAssetsCache.addToCache(preview);
      for (const parentId of asset.parentIds) {
        const checkChildren =
          this._hasChildrenAssetsCache.getElementSync(parentId);
        if (checkChildren && !checkChildren.hasChildren) {
          this._hasChildrenAssetsCache.addToCache({
            id: parentId,
            hasChildren: true,
          });
        }
      }
    }

    if (this._externalContentListener && request_listen) {
      this._externalContentListener.listenAssetFullIds(
        asset_fulls.map((a) => a.id),
      );
    }
  }

  public updateFullInstanceCache(
    full_res: AssetsFullResult,
    request_listen = true,
  ): void {
    assert(this._shortAssetsCache, 'Not inited');
    this.updateFullInstancesCache(
      Object.values(full_res.objects.assetFulls),
      request_listen,
    );
    this.updateShortAssetsCache(
      Object.values(full_res.objects.assetShorts),
      request_listen,
    );
    this.updateWorkspacesCache(
      Object.values(full_res.objects.workspaces),
      request_listen,
    );
  }

  public requestExternalEventListenFullAssetIds(asset_ids: string[]) {
    if (this._externalContentListener) {
      this._externalContentListener.listenAssetFullIds(asset_ids);
    }
  }

  updateShortAssetsCache(assets: AssetShort[], request_listen = true) {
    assert(this._shortAssetsCache, 'Not inited');
    this._shortAssetsCache.addToCacheMany(assets);

    if (this._externalContentListener && request_listen) {
      this._externalContentListener.listenAssetShortIds(
        assets.map((a) => a.id),
      );
    }
  }

  updateWorkspacesCache(workspaces: Workspace[], request_listen = true) {
    assert(this._workspacesCache, 'Not inited');
    this._workspacesCache.addToCacheMany(workspaces);

    if (this._externalContentListener && request_listen) {
      this._externalContentListener.listenWorkpaceIds(
        workspaces.map((w) => w.id),
      );
    }
  }

  async getAssetInstancesList(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<ApiResultListWithTotal<AssetFullInstanceR>> {
    assert(this._projectDatabase, 'Not inited');
    const res = await this._projectDatabase.assetsGetFull(query);
    this.updateFullInstanceCache(res);
    return {
      list: res.ids.map((id) => {
        assert(this._fullAssetsCache, 'Not inited');
        const instance = this._fullAssetsCache.getElementSync(id);
        assert(instance);
        return instance;
      }),
      total: res.total,
    };
  }

  async getAssetsListForGraph(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<AssetsGraph> {
    assert(this._projectDatabase, 'Not inited');
    const graph = await this._projectDatabase.assetsGraph(query);
    this._shortAssetsCache?.addToCacheMany(Object.values(graph.objects.assets));
    return graph;
  }

  getAssetsView<T extends AssetProps>(
    query: AssetPropsSelection,
    options?: { folded: false },
  ): Promise<ApiResultListWithTotal<T>>;
  getAssetsView<T extends AssetPropsPlainObject>(
    query: AssetPropsSelection,
    options: { folded: true } | { folded: boolean },
  ): Promise<ApiResultListWithTotal<T>>;
  async getAssetsView<T extends AssetPropsPlainObject>(
    query: AssetPropsSelection,
    options?: { folded: boolean },
  ): Promise<ApiResultListWithTotal<T>> {
    assert(this._projectDatabase, 'Not inited');
    if (!options || !options.folded) {
      return this._projectDatabase.assetsGetView<AssetProps>(query) as Promise<
        ApiResultListWithTotal<T>
      >;
    } else {
      return this._projectDatabase.assetsGetView<T>(query, options);
    }
  }

  getAssetsViewAll<T extends AssetProps>(
    query: AssetPropsSelection,
    options?: { folded: false },
  ): Promise<ApiResultListWithTotal<T>>;
  getAssetsViewAll<T extends AssetPropsPlainObject>(
    query: AssetPropsSelection,
    options: { folded: true } | { folded: boolean },
  ): Promise<ApiResultListWithTotal<T>>;
  async getAssetsViewAll<T extends AssetPropsPlainObject>(
    query: AssetPropsSelection,
    options?: { folded: boolean },
  ): Promise<ApiResultListWithTotal<T>> {
    const res = await (options
      ? this.getAssetsView<T>(query, options)
      : (this.getAssetsView<AssetProps>(query) as Promise<
          ApiResultListWithTotal<T>
        >));
    let has_more = res.total > res.list.length;
    let next_offset = res.list.length;
    while (has_more) {
      const chunk_query = {
        ...query,
        offset: next_offset,
      };
      const chunk = await (options
        ? this.getAssetsView<T>(chunk_query, options)
        : (this.getAssetsView<AssetProps>(chunk_query) as Promise<
            ApiResultListWithTotal<T>
          >));
      if (chunk.list.length === 0) break;
      next_offset += chunk.list.length;
      res.list = [...res.list, ...chunk.list];
      has_more = res.total > res.list.length;
    }
    res.total = res.list.length;
    return res;
  }

  async createAsset(
    params: AssetCreateDTO,
    post_create_hook?: (
      res: AssetsChangeResult,
    ) => AssetsChangeResult | Promise<AssetsChangeResult>,
  ): Promise<AssetsChangeResult & { limit?: boolean }> {
    assert(this._projectDatabase, 'Not inited');

    let res = await this._expectMyEvents(
      async () => {
        return await this._projectDatabase!.assetsCreate(params);
      },
      (res) => {
        return {
          assetIds: res.ids,
          workspaceIds: res.touchedWIds,
        };
      },
    );
    this.updateFullInstanceCache(res);
    if (post_create_hook) {
      res = await post_create_hook(res);
      this.updateFullInstanceCache(res);
    }
    await this.projectContentEvents.notify({
      aUpsIds: res.ids,
      aDelIds: [],
      wUpsIds: [],
      wDelIds: [],
      wTchIds: res.touchedWIds,
      instigator: this._getCurrentUserInstigator(),
    });
    return res;
  }

  async makeAssetMultipleChange(
    where: AssetWhereParams,
    ops: AssetChangeContent[],
    options?: { pid?: string },
  ): Promise<CreatorsAssetMultipleChangeResult> {
    let lastChangeRes: AssetsChangeResult | undefined = undefined;
    let lastDeletetion: AssetDeleteResultDTO | undefined = undefined;
    const res: CreatorsAssetMultipleChangeResult = {
      upsert: createEmptyAssetFullResult(),
      deletedIds: [],
      changeIds: [],
      touchedWIds: [],
    };
    if (ops.length === 0) {
      return res;
    }
    try {
      for (let b = 0; b < ops.length; b++) {
        if (ops[b].delete) {
          lastDeletetion = await this._deleteAssetsImpl(where, options);
          if (lastDeletetion.changeId) {
            res.changeIds.push(lastDeletetion.changeId);
          }
          if (lastDeletetion.touchedWIds.length > 0) {
            res.touchedWIds = [
              ...res.touchedWIds,
              ...lastDeletetion.touchedWIds,
            ];
          }
          lastChangeRes = undefined;
        } else if (ops[b].restore) {
          lastChangeRes = await this._restoreAssetsImpl(where, options);
          if (lastChangeRes.changeId) {
            res.changeIds.push(lastChangeRes.changeId);
          }
          if (lastChangeRes.touchedWIds.length > 0) {
            res.touchedWIds = [
              ...res.touchedWIds,
              ...lastChangeRes.touchedWIds,
            ];
          }
          lastDeletetion = undefined;
        } else {
          if (lastDeletetion) continue; // Ignore due to deletion
          lastChangeRes = await this._changeAssetsImpl(where, ops[b], options);
          if (lastChangeRes.changeId) {
            res.changeIds.push(lastChangeRes.changeId);
          }
          if (lastChangeRes.touchedWIds.length > 0) {
            res.touchedWIds = [
              ...res.touchedWIds,
              ...lastChangeRes.touchedWIds,
            ];
          }
        }
      }
    } finally {
      if (lastChangeRes) {
        this.updateFullInstanceCache(lastChangeRes);
        res.upsert = lastChangeRes;
      }
      if (lastDeletetion) {
        res.deletedIds = lastDeletetion.ids;
        this._shortAssetsCache?.setNotFoundKeys(res.deletedIds);
        this._fullAssetsCache?.setNotFoundKeys(res.deletedIds);
        this._previewAssetsCache?.setNotFoundKeys(res.deletedIds);
      }
    }

    const reload_changed_assets: string[] = [];
    if (res.deletedIds.length > 0 && this._fullAssetsCache) {
      // Delete references to deleted assets
      for (const del_id of res.deletedIds) {
        for (const full_entry of this._fullAssetsCache.entries()) {
          if (!full_entry.value) continue;
          if (res.deletedIds.includes(full_entry.value.id)) continue;

          const new_references = full_entry.value.references.filter(
            (r) => r.targetAssetId !== del_id,
          );
          if (new_references.length !== full_entry.value.references.length) {
            full_entry.value.references = new_references;
            if (res.upsert.ids.indexOf(full_entry.value.id) < 0) {
              res.upsert.ids.push(full_entry.value.id);
            }
            const has_old_updsert =
              res.upsert.objects.assetFulls.hasOwnProperty(full_entry.value.id);
            if (has_old_updsert) {
              res.upsert.objects.assetFulls[full_entry.value.id].references =
                new_references;
            } else {
              res.upsert.objects.assetFulls[full_entry.value.id] =
                full_entry.value.convertToFull();
            }

            const complete_track = !!full_entry.value.getPropValue(
              '__meta',
              'complete_track',
              false,
            ).value;
            if (complete_track) {
              reload_changed_assets.push(full_entry.value.id);
            }
          }
        }
      }
    }

    if (reload_changed_assets.length > 0) {
      await this.getAssetInstancesList({
        where: {
          id: reload_changed_assets,
        },
      });
      for (const reloaded_id of reload_changed_assets) {
        const instance = this.getAssetInstanceViaCacheSync(reloaded_id);
        if (instance) {
          res.upsert.objects.assetFulls[instance.id] = instance.convertToFull();
        }
      }
    }

    await this.projectContentEvents.notify({
      aUpsIds: res.upsert.ids,
      aDelIds: res.deletedIds,
      wUpsIds: [],
      wDelIds: [],
      wTchIds: [...new Set(res.touchedWIds)],
      instigator: this._getCurrentUserInstigator(),
    });
    return res;
  }

  private async _changeAssetsImpl(
    where: AssetWhereParams,
    set: AssetSetDTO,
    options?: { pid?: string },
  ): Promise<AssetsChangeResult> {
    assert(this._projectDatabase, 'Not inited');
    return await this._expectMyEvents(
      async () => {
        return await this._projectDatabase!.assetsChange(
          {
            where,
            set,
          },
          options,
        );
      },
      (res) => {
        return {
          assetIds: res.ids,
          workspaceIds: res.touchedWIds,
        };
      },
    );
  }

  async changeAssets(
    params: AssetChangeDTO,
    options?: { pid?: string },
  ): Promise<AssetsChangeResult> {
    if (!params.set) {
      return {
        ...createEmptyAssetFullResult(),
        changeId: null,
        touchedWIds: [],
      };
    }
    const res = await this.makeAssetMultipleChange(
      params.where,
      [params.set],
      options,
    );
    return {
      ...res.upsert,
      changeId: res.changeIds.length > 0 ? res.changeIds[0] : null,
      touchedWIds: res.touchedWIds,
    };
  }

  async changeAssetsBatch(
    params: {
      ops: AssetChangeBatchOpDTO[];
    },
    options?: { pid?: string },
  ): Promise<AssetsBatchChangeResultDTO> {
    assert(this._projectDatabase, 'Not inited');
    const res = await this._projectDatabase?.assetsChangeBatch(params, options);
    this.updateFullInstanceCache(res);
    await this.projectContentEvents.notify({
      aUpsIds: res.ids,
      aDelIds: [],
      wUpsIds: [],
      wDelIds: [],
      wTchIds: res.touchedWIds,
      instigator: this._getCurrentUserInstigator(),
    });
    return res;
  }

  async changeAssetsUndo(
    params: {
      changeId: string;
    },
    options?: { pid?: string },
  ): Promise<AssetsChangeResult> {
    assert(this._projectDatabase, 'Not inited');
    const res = await this._projectDatabase?.assetsChangeUndo(params, options);
    this.updateFullInstanceCache(res);
    await this.projectContentEvents.notify({
      aUpsIds: res.ids,
      aDelIds: [],
      wUpsIds: [],
      wDelIds: [],
      wTchIds: res.touchedWIds,
      instigator: this._getCurrentUserInstigator(),
    });
    return res;
  }

  async moveAssets(params: AssetMoveParams): Promise<AssetMoveResult> {
    assert(this._projectDatabase, 'Not inited');
    assert(this._fullAssetsCache, 'Not inited');
    assert(this._shortAssetsCache, 'Not inited');
    const res = await this._expectMyEvents(
      async () => {
        return await this._projectDatabase!.assetsMove(params);
      },
      (res) => {
        return {
          assetIds: res.list.map((a) => a.id),
          workspaceIds: res.touchedWIds,
        };
      },
    );

    const moved_ids: string[] = [];
    for (const item of res.list) {
      moved_ids.push(item.id);
      const cache_short = this._shortAssetsCache.getElementSync(item.id);
      if (cache_short) {
        cache_short.workspaceId = item.workspaceId;
        cache_short.index = item.index;
      }
      const cached_full = this._fullAssetsCache.getElementSync(item.id);
      if (cached_full) {
        const full_changed = {
          ...cached_full.convertToFull(),
          workspaceId: item.workspaceId,
          index: item.index,
        };
        cached_full.update(full_changed);
      }
    }
    this.projectContentEvents.notify({
      aUpsIds: moved_ids,
      aDelIds: [],
      wTchIds: res.touchedWIds,
      wDelIds: [],
      wUpsIds: [],
      instigator: this._getCurrentUserInstigator(),
    });
    return res;
  }

  async moveWorkspaces(
    params: WorkspaceMoveParams,
  ): Promise<WorkspaceMoveResult> {
    assert(this._projectDatabase, 'Not inited');
    assert(this._workspacesCache, 'Not inited');
    const res = await this._expectMyEvents(
      async () => {
        return await this._projectDatabase!.workspacesMove(params);
      },
      (res) => {
        return {
          assetIds: [],
          workspaceIds: [...res.list.map((w) => w.id), ...res.touchedWIds],
        };
      },
    );
    const notify_upsert_ids: string[] = [];
    for (const item of res.list) {
      notify_upsert_ids.push(item.id);
      const cache_workspace = this._workspacesCache.getElementSync(item.id);
      if (cache_workspace) {
        cache_workspace.index = item.index;
        cache_workspace.parentId = item.parentId;
      }
    }
    this.projectContentEvents.notify({
      aUpsIds: [],
      aDelIds: [],
      wUpsIds: notify_upsert_ids,
      wDelIds: [],
      wTchIds: res.touchedWIds,
      instigator: this._getCurrentUserInstigator(),
    });
    return res;
  }

  private async _deleteAssetsImpl(
    where: AssetWhereParams,
    options?: { pid?: string },
  ): Promise<AssetDeleteResultDTO> {
    assert(this._projectDatabase, 'Not inited');
    return await this._expectMyEvents(
      async () => {
        return await this._projectDatabase!.assetsDelete(where, options);
      },
      (res) => {
        return {
          assetIds: res.ids,
          workspaceIds: res.touchedWIds,
        };
      },
    );
  }

  async deleteAssets(
    params: {
      where: AssetWhereParams;
    },
    options?: { pid?: string },
  ): Promise<AssetDeleteResultDTO> {
    const res = await this.makeAssetMultipleChange(
      params.where,
      [
        {
          delete: true,
        },
      ],
      options,
    );
    return {
      ids: res.deletedIds,
      changeId: res.changeIds.length > 0 ? res.changeIds[0] : null,
      touchedWIds: res.touchedWIds,
    };
  }

  private async _restoreAssetsImpl(
    where: AssetWhereParams,
    options?: { pid?: string },
  ): Promise<AssetsChangeResult> {
    assert(this._projectDatabase, 'Not inited');
    return await this._expectMyEvents(
      async () => {
        return await this._projectDatabase!.assetsRestore(where, options);
      },
      (res) => {
        return {
          assetIds: res.ids,
          workspaceIds: res.touchedWIds,
        };
      },
    );
  }

  async restoreAssets(
    params: {
      where: AssetWhereParams;
    },
    options?: { pid?: string },
  ): Promise<AssetsChangeResult> {
    const res = await this.makeAssetMultipleChange(
      params.where,
      [
        {
          restore: true,
        },
      ],
      options,
    );
    return {
      ...res.upsert,
      changeId: res.changeIds.length > 0 ? res.changeIds[0] : null,
      touchedWIds: res.touchedWIds,
    };
  }

  canCreateAsset(): boolean {
    return this.appManager.get(ProjectManager).canCreateAssets();
  }

  getProjectInfo() {
    return this.appManager.get(ProjectManager).getProjectInfo();
  }

  canRenameAsset(asset: AssetShort): boolean {
    return asset.rights >= MIN_ASSET_RIGHTS_TO_RENAME;
  }

  canChangeAsset(asset: AssetShort): boolean {
    return asset.rights >= MIN_ASSET_RIGHTS_TO_CHANGE;
  }

  canDeleteAsset(asset: AssetShort): boolean {
    return asset.rights >= MIN_ASSET_RIGHTS_TO_DELETE;
  }

  forgetAssetInCacheById(assetId: string) {
    assert(this._shortAssetsCache, 'Not inited');
    assert(this._fullAssetsCache, 'Not inited');
    assert(this._previewAssetsCache, 'Not inited');
    this._shortAssetsCache.invalidateElement(assetId);
    this._previewAssetsCache.invalidateElement(assetId);
    this._fullAssetsCache.invalidateElement(assetId);
  }

  //ASSET LINKS

  async createRef(params: CreateRefDTO): Promise<AssetReferencesResult> {
    assert(this._projectDatabase, 'Not inited');
    const create_asset_refs =
      await this._projectDatabase.assetsCreateRef(params);
    const notify_upsert_ids: string[] = [];
    let load_from_server = false;
    for (const id of create_asset_refs.ids) {
      const full_instance = this.getAssetInstanceViaCacheSync(id);
      if (full_instance && create_asset_refs.refs.hasOwnProperty(id)) {
        load_from_server = !!full_instance.getPropValue(
          '__meta',
          'complete_track',
          false,
        ).value;
        full_instance.references = create_asset_refs.refs[id];
        notify_upsert_ids.push(id);
      }
    }
    if (notify_upsert_ids.length > 0) {
      if (load_from_server) {
        await this.getAssetInstancesList({
          where: {
            id: notify_upsert_ids,
          },
        });
      }
      await this.projectContentEvents.notify({
        aUpsIds: notify_upsert_ids,
        aDelIds: [],
        wTchIds: [],
        wDelIds: [],
        wUpsIds: [],
        instigator: this._getCurrentUserInstigator(),
      });
    }
    return create_asset_refs;
  }

  async deleteRef(params: CreateRefDTO): Promise<{ ids: string[] }> {
    assert(this._projectDatabase, 'Not inited');
    const found_assets = await this._projectDatabase.assetsDeleteRef(params);
    const notify_upsert_ids: string[] = [];
    let load_from_server = false;
    for (const id of found_assets.ids) {
      const full_instance = this.getAssetInstanceViaCacheSync(id);
      if (full_instance) {
        load_from_server = !!full_instance.getPropValue(
          '__meta',
          'complete_track',
          false,
        ).value;
        full_instance.references = full_instance.references.filter((ref) => {
          if (ref.targetAssetId !== params.targetAssetId) return true;
          if (
            ref.targetBlockId !== params.targetBlockId ||
            params.targetBlockId === undefined
          ) {
            return true;
          }
          if (
            params.blockId !== ref.sourceBlockId ||
            params.blockId === undefined
          ) {
            return true;
          }

          return false;
        });
        notify_upsert_ids.push(id);
      }
    }
    if (notify_upsert_ids.length > 0) {
      if (load_from_server) {
        await this.getAssetInstancesList({
          where: {
            id: notify_upsert_ids,
          },
        });
      }
      await this.projectContentEvents.notify({
        aUpsIds: notify_upsert_ids,
        aDelIds: [],
        wTchIds: [],
        wDelIds: [],
        wUpsIds: [],
        instigator: this._getCurrentUserInstigator(),
      });
    }
    return found_assets;
  }

  async copyAsset(
    full: AssetForEdit | null,
    title: string,
  ): Promise<AssetsFullResult> {
    if (!full) throw new Error('Asset not found');
    let blocks:
      | {
          [blockKey: string]: AssetBlockParamsDTO;
        }
      | undefined = undefined;
    for (const r of full.blocks) {
      const key = stringifyAssetNewBlockRef(null, r.id);
      if (!blocks) blocks = {};
      blocks[key] = {
        index: r.index,
        name: r.name,
        title: r.title,
        props: r.props,
        type: r.type,
      };
    }
    return await this.createAsset({
      set: {
        icon: full.ownIcon ?? undefined,
        title,
        isAbstract: full.isAbstract,
        parentIds: full.parentIds,
        workspaceId: full.workspaceId ?? undefined,
        blocks,
      },
    });
  }

  async getHistory(
    assetId: string,
  ): Promise<ApiResultListWithMore<AssetHistoryDTO>> {
    assert(this._projectDatabase, 'Not inited');
    return await this._projectDatabase.assetsGetHistory(assetId);
  }

  async getGlobalHistory(
    pid: string,
    count: number,
    whereAssets?: { workspaceids?: string },
    where?: { dateTo?: string },
  ): Promise<AssetGlobalHistoryResultDTO> {
    const changesHistory: AssetGlobalHistoryResultDTO =
      await this._apiManager.call(
        Service.CREATORS,
        HttpMethods.GET,
        `assets/history/`,
        {},
        {
          where: where ? JSON.stringify(where) : undefined,
          whereAssets: whereAssets ? JSON.stringify(whereAssets) : undefined,
          count,
          pid,
        },
      );
    assert(this._shortAssetsCache, 'Not inited');
    if (this._shortAssetsCache) {
      this.updateShortAssetsCache(
        Object.values(changesHistory.objects.assetShorts),
      );
    }
    return changesHistory;
  }

  getParentWorkspacesListFromCache(
    workspace_id: string,
  ): Workspace[] | undefined {
    assert(this._workspacesCache, 'Not inited');
    const res: Workspace[] = [];
    let cur_workspace_id: string | null = workspace_id;
    while (cur_workspace_id) {
      const workspace = this._workspacesCache.getElementSync(cur_workspace_id);
      if (workspace === undefined) return undefined; // Not in cache
      if (!workspace) break;
      res.unshift(workspace);
      cur_workspace_id = workspace.parentId;
    }
    return res;
  }

  async getParentWorkspaces(workspace_id: string): Promise<Workspace[]> {
    assert(this._workspacesCache, 'Not inited');
    const res: Workspace[] = [];
    let cur_workspace_id: string | null = workspace_id;
    while (cur_workspace_id) {
      const workspace = await this.getWorkspaceByIdViaCache(cur_workspace_id);
      if (!workspace) break;
      res.unshift(workspace);
      cur_workspace_id = workspace.parentId;
    }
    return res;
  }

  async checkWorkspaceIsInside(
    workspace_id: string,
    target_workspace_id: string,
    allow_same = false,
  ): Promise<boolean> {
    if (workspace_id === target_workspace_id) {
      return allow_same;
    }
    const workspace_parents = await this.getParentWorkspaces(workspace_id);
    return workspace_parents.some((w) => w.id === target_workspace_id);
  }

  serializeAssetFullInstances(assets: AssetFullInstanceR[]): AssetsFullResult {
    const res: AssetsFullResult = {
      ids: assets.map((a) => a.id),
      objects: {
        assetFulls: {},
        assetShorts: {},
        users: {},
        workspaces: {},
      },
      total: assets.length,
    };
    for (const asset of assets) {
      res.objects.assetFulls[asset.id] = asset.convertToFull();
      if (asset.typeIds) {
        for (const type_id of asset.typeIds) {
          const short = this.getAssetShortViaCacheSync(type_id);
          if (!short) continue;
          res.objects.assetShorts[short.id] = short;
        }
      }
      const workspaces = asset.workspaceId
        ? (this.getParentWorkspacesListFromCache(asset.workspaceId) ?? [])
        : [];
      for (const workspace of workspaces) {
        res.objects.workspaces[workspace.id] = workspace;
      }
    }
    return res;
  }

  async matchAssetShortsWithWhere(
    assets: AssetShort[],
    where: AssetPropWhere,
  ): Promise<AssetShort[]> {
    let custom_where = false;

    const project_info = this.appManager.get(ProjectManager).getProjectInfo();

    const match_string_values = (
      asset_val: string[],
      filter_val: AssetPropWhereCondition,
    ): boolean | undefined => {
      if (Array.isArray(filter_val)) {
        let failed = 0;
        for (const filter_val_one of filter_val) {
          if (typeof filter_val_one === 'string') {
            if (asset_val.includes(filter_val_one)) {
              return true;
            } else failed++;
          } else break;
        }
        if (failed === filter_val.length) return false;
      } else if (typeof filter_val === 'string') {
        return asset_val.includes(filter_val);
      } else if (filter_val && (filter_val as AssetPropWhereOp).op) {
        const op = filter_val as AssetPropWhereOp;
        if (op.op === AssetPropWhereOpKind.EQUAL && typeof op.v === 'string') {
          return asset_val.includes(op.v);
        } else if (
          op.op === AssetPropWhereOpKind.EQUAL_NOT &&
          typeof op.v === 'string'
        ) {
          return !asset_val.includes(op.v);
        }
      }
      return undefined;
    };

    const match_single_inside = (
      asset: AssetShort,
      filter_val: AssetPropWhereCondition,
    ) => {
      const asset_workspaces = asset.workspaceId
        ? this.getParentWorkspacesListFromCache(asset.workspaceId)
        : [];
      if (asset_workspaces) {
        const m = match_string_values(
          asset_workspaces.map((w) => w.id),
          filter_val,
        );
        return m;
      }
      return undefined;
    };

    const match_single = (asset: AssetShort) => {
      for (const [key, val] of Object.entries(where)) {
        if (custom_where) {
          break;
        }
        if (val === undefined) continue;
        switch (key) {
          case 'id': {
            const m = match_string_values([asset.id], val);
            if (m === false) return m;
            else if (m === true) continue;
            break;
          }
          case 'typeids': {
            const m = match_string_values(asset.typeIds, val);
            if (m === false) return m;
            else if (m === true) continue;
            break;
          }
          case 'workspaceids': {
            const m = match_single_inside(asset, val);
            if (m === false) return m;
            else if (m === true) continue;
            break;
          }
          case 'inside': {
            const val_arr = Array.isArray(val) ? val : [val];
            const val_ids: string[] = [];

            for (const v of val_arr) {
              if (typeof v !== 'string') {
                custom_where = true;
                break;
              }
              if (isUUID(v)) {
                val_ids.push(v);
              } else {
                const workspace = this.getWorkspaceByNameViaCacheSync(v);
                if (workspace) val_ids.push(workspace.id);
                else {
                  custom_where = true;
                  break;
                }
              }
            }

            if (!custom_where) {
              const m = match_single_inside(asset, val_ids);
              if (m === false) return m;
              else if (m === true) continue;
            }
            break;
          }
          case 'type': {
            const val_arr = Array.isArray(val) ? val : [val];
            const val_ids: string[] = [];

            for (const v of val_arr) {
              if (typeof v !== 'string') {
                custom_where = true;
                break;
              }
              if (isUUID(v)) {
                val_ids.push(v);
              } else {
                const asset = this.getAssetShortByNameViaCacheSync(v);
                if (asset) val_ids.push(asset.id);
                else {
                  custom_where = true;
                  break;
                }
              }
            }

            if (!custom_where) {
              const m = match_string_values(asset.typeIds, val_ids);
              if (m === false) return m;
              else if (m === true) continue;
            }
            break;
          }
          case 'issystem':
          case 'isSystem': {
            if (typeof val === 'boolean' && project_info) {
              if (val && asset.projectId !== project_info.id) {
                return false;
              } else if (!val && asset.projectId === project_info.id) {
                continue;
              }
            }
            break;
          }
        }
        custom_where = true;
      }
      return true;
    };

    const matched_simple: AssetShort[] = [];
    for (const asset of assets) {
      if (custom_where) break;
      if (match_single(asset)) {
        matched_simple.push(asset);
      }
    }

    if (!custom_where) return matched_simple;

    const matched = await this.getAssetsView<{ id: string }>({
      where: {
        id: assets.map((a) => a.id),
        cond: {
          op: AssetPropWhereOpKind.AND,
          v: [where],
        },
      },
      select: ['id'],
    });
    const matched_ids = new Set(matched.list.map((m) => m.id));
    return assets.filter((a) => matched_ids.has(a.id));
  }

  async checkHasChildrenViaCache(assetId: string): Promise<boolean | null> {
    assert(this._hasChildrenAssetsCache, 'Not inited');
    const element = await this._hasChildrenAssetsCache.getElement(assetId);
    return element ? element.hasChildren : null;
  }

  async getAssetLocalPath(asset_id: string): Promise<string | null> {
    assert(this._projectDatabase, 'Not inited');
    return await this._projectDatabase.getAssetLocalPath(asset_id);
  }

  async getWorkspaceLocalPath(workspace_id: string): Promise<string | null> {
    assert(this._projectDatabase, 'Not inited');
    return await this._projectDatabase.getWorkspaceLocalPath(workspace_id);
  }

  saveState(): Record<string, any> {
    const state: Record<string, any> = {};
    const full = this._fullAssetsCache?.getAllElements();
    state['full'] = full ? full.map((f) => f.convertToFull()) : undefined;
    state['short'] = this._shortAssetsCache?.getAllElements();
    state['previews'] = this._previewAssetsCache?.getAllElements();
    state['workspaces'] = this._workspacesCache?.getAllElements();
    state['has_childrens'] = this._hasChildrenAssetsCache?.getAllElements();
    return state;
  }

  loadState(state: Record<string, any>) {
    if (state.full) {
      this.updateFullInstancesCache(state.full);
    }
    if (state.short) {
      this._shortAssetsCache?.addToCacheMany(state.short);
    }
    if (state.previews) {
      this._previewAssetsCache?.addToCacheMany(state.previews);
    }
    if (state.workspaces) {
      this._workspacesCache?.addToCacheMany(state.workspaces);
    }
    if (state.has_childrens) {
      this._hasChildrenAssetsCache?.addToCacheMany(state.has_childrens);
    }
  }
}
