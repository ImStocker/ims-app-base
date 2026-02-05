import type ApiManager from '../managers/ApiManager';
import { HttpMethods, Service } from '../managers/ApiWorker';
import type { AssetHistoryDTO } from './AssetHistory';
import type {
  AssetChangeDTO,
  AssetCreateDTO,
  AssetDeleteResultDTO,
  AssetQueryWhere,
  AssetReferencesResult,
  AssetMoveResult,
  AssetsChangeResult,
  AssetsFullResult,
  AssetsGraph,
  AssetsShortResult,
  AssetWhereParams,
  CreateRefDTO,
  AssetMoveParams,
  AssetsBatchChangeResultDTO,
  AssetChangeBatchOpDTO,
} from './AssetsType';
import type { IProjectDatabase } from './IProjectDatabase';
import type {
  ApiRequestList,
  ApiResultListWithMore,
  ApiResultListWithTotal,
} from './ProjectTypes';
import type { AssetProps, AssetPropsPlainObject } from './Props';
import type { AssetPropsSelection } from './PropsSelection';
import type {
  WorkspaceQueryDTOWhere,
  Workspace,
  ChangeWorkspaceRequest,
  WorkspaceMoveResult,
  WorkspaceMoveParams,
} from './Workspaces';

export class ProjectDatabaseViaServerApi implements IProjectDatabase {
  constructor(private _apiManager: ApiManager) {}

  assetsGetShort(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<AssetsShortResult> {
    return this._apiManager.call<AssetsShortResult>(
      Service.CREATORS,
      HttpMethods.GET,
      'assets/short',
      {
        where: JSON.stringify(query.where ? query.where : {}),
        count: query.count,
        offset: query.offset,
      },
    );
  }

  assetsGetFull(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<AssetsFullResult> {
    return this._apiManager.call<AssetsFullResult>(
      Service.CREATORS,
      HttpMethods.GET,
      'assets/full',
      {
        where: JSON.stringify(query.where ? query.where : {}),
        count: query.count,
        offset: query.offset,
      },
    );
  }

  assetsGraph(query: ApiRequestList<AssetQueryWhere>): Promise<AssetsGraph> {
    return this._apiManager.call<AssetsGraph>(
      Service.CREATORS,
      HttpMethods.GET,
      'assets/graph',
      {
        where: JSON.stringify(query.where ? query.where : {}),
        count: query.count,
        offset: query.offset,
      },
    );
  }

  assetsGetView<T extends AssetProps>(
    query: AssetPropsSelection,
    options?: { folded: false },
  ): Promise<ApiResultListWithTotal<T>>;
  assetsGetView<T extends AssetPropsPlainObject>(
    query: AssetPropsSelection,
    options: { folded: true } | { folded: boolean },
  ): Promise<ApiResultListWithTotal<T>>;
  assetsGetView<T extends AssetPropsPlainObject>(
    query: AssetPropsSelection,
    options?: { folded: boolean },
  ): Promise<ApiResultListWithTotal<T>> {
    return this._apiManager.call(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/view/get',
      {
        select: query.select,
        where: query.where ? query.where : undefined,
        order: query.order ? query.order : undefined,
        group: query.group ? query.group : undefined,
        count: query.count,
        offset: query.offset,
        options: options ? options : undefined,
      },
    );
  }

  assetsCreate(params: AssetCreateDTO): Promise<AssetsChangeResult> {
    return this._apiManager.call<AssetsChangeResult>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/create',
      { ...params },
    );
  }

  assetsChange(
    params: AssetChangeDTO,
    options?: { pid?: string },
  ): Promise<AssetsChangeResult> {
    const get_params: any = {};
    if (options && options.pid) {
      get_params['pid'] = options.pid;
    }
    return this._apiManager.call<AssetsChangeResult>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/change',
      params,
      get_params,
    );
  }

  assetsChangeUndo(
    params: {
      changeId: string;
    },
    options?: { pid?: string },
  ): Promise<AssetsChangeResult> {
    const get_params: any = {};
    if (options && options.pid) {
      get_params['pid'] = options.pid;
    }
    return this._apiManager.call<AssetsChangeResult>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/change/undo',
      params,
      get_params,
    );
  }

  assetsChangeBatch(
    params: {
      ops: AssetChangeBatchOpDTO[];
    },
    options?: { pid?: string },
  ): Promise<AssetsBatchChangeResultDTO> {
    const get_params: any = {};
    if (options && options.pid) {
      get_params['pid'] = options.pid;
    }
    return this._apiManager.call<AssetsBatchChangeResultDTO>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/change/batch',
      params,
      get_params,
    );
  }

  assetsMove(params: AssetMoveParams): Promise<AssetMoveResult> {
    return this._apiManager.call<AssetMoveResult>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/move',
      params,
    );
  }

  assetsDelete(
    where: AssetWhereParams,
    options?: { pid?: string },
  ): Promise<AssetDeleteResultDTO> {
    const get_params: any = {};
    if (options && options.pid) {
      get_params['pid'] = options.pid;
    }
    return this._apiManager.call<AssetDeleteResultDTO>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/delete',
      {
        where,
      },
      get_params,
    );
  }

  assetsRestore(
    where: AssetWhereParams,
    options?: { pid?: string },
  ): Promise<AssetsChangeResult> {
    const get_params: any = {};
    if (options && options.pid) {
      get_params['pid'] = options.pid;
    }
    return this._apiManager.call<AssetsChangeResult>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/restore',
      {
        where,
      },
      get_params,
    );
  }

  assetsCreateRef(params: CreateRefDTO): Promise<AssetReferencesResult> {
    return this._apiManager.call<AssetReferencesResult>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/ref',
      {
        ...params,
      },
    );
  }

  assetsDeleteRef(params: CreateRefDTO): Promise<{ ids: string[] }> {
    return this._apiManager.call<{ ids: string[] }>(
      Service.CREATORS,
      HttpMethods.DELETE,
      `assets/ref`,
      {
        ...params,
      },
    );
  }

  assetsGetHistory(
    assetId: string,
  ): Promise<ApiResultListWithMore<AssetHistoryDTO>> {
    return this._apiManager.call(
      Service.CREATORS,
      HttpMethods.GET,
      `assets/history/${assetId}`,
      {},
    );
  }

  workspacesGet(
    query: ApiRequestList<WorkspaceQueryDTOWhere>,
  ): Promise<ApiResultListWithTotal<Workspace>> {
    return this._apiManager.call<ApiResultListWithTotal<Workspace>>(
      Service.CREATORS,
      HttpMethods.GET,
      'workspaces',
      {
        where: JSON.stringify(query.where ? query.where : {}),
        count: query.count,
        offset: query.offset,
      },
    );
  }

  workspacesCreate(params: ChangeWorkspaceRequest): Promise<Workspace> {
    return this._apiManager.call<Workspace>(
      Service.CREATORS,
      HttpMethods.POST,
      'workspaces',
      params,
    );
  }

  workspacesChange(
    workspace_id: string,
    params: ChangeWorkspaceRequest,
  ): Promise<Workspace> {
    return this._apiManager.call<Workspace>(
      Service.CREATORS,
      HttpMethods.PATCH,
      'workspaces/' + workspace_id,
      params,
    );
  }

  workspacesDelete(workspace_id: string): Promise<void> {
    return this._apiManager.call(
      Service.CREATORS,
      HttpMethods.DELETE,
      'workspaces/' + workspace_id,
    );
  }

  workspacesMove(params: WorkspaceMoveParams): Promise<WorkspaceMoveResult> {
    return this._apiManager.call<WorkspaceMoveResult>(
      Service.CREATORS,
      HttpMethods.POST,
      'workspaces/move',
      params,
    );
  }

  async getAssetLocalPath(_asset_id: string): Promise<string | null> {
    return null;
  }

  async getWorkspaceLocalPath(_workspace_id: string): Promise<string | null> {
    return null;
  }
}
