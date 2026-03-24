import type { AssetHistoryDTO } from './AssetHistory';
import type {
  AssetChangeDTO,
  AssetCreateDTO,
  AssetDeleteRefResultDTO,
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
import type {
  ApiRequestList,
  ApiResultListWithMore,
  ApiResultListWithTotal,
} from './ProjectTypes';
import type { AssetProps, AssetPropsPlainObject } from './Props';
import type { AssetPropsSelection } from './PropsSelection';
import type {
  ChangeWorkspaceRequest,
  Workspace,
  WorkspaceMoveParams,
  WorkspaceMoveResult,
  WorkspaceQueryDTOWhere,
} from './Workspaces';

export type ProjectContentChangeEventArg = {
  aUpsIds: string[];
  aDelIds: string[];
  wUpsIds: string[];
  wDelIds: string[];
  wTchIds: string[];
  instigator: number | null;
};

export interface IProjectDatabaseAsset {
  assetsGetShort(
    query: ApiRequestList<AssetQueryWhere>,
    options?: { pid?: string },
  ): Promise<AssetsShortResult>;
  assetsGetFull(
    query: ApiRequestList<AssetQueryWhere>,
    options?: { pid?: string },
  ): Promise<AssetsFullResult>;

  assetsGetView<T extends AssetProps>(
    query: AssetPropsSelection,
    options?: { folded: false; pid?: string },
  ): Promise<ApiResultListWithTotal<T>>;
  assetsGetView<T extends AssetPropsPlainObject>(
    query: AssetPropsSelection,
    options: { folded: true; pid?: string } | { folded: boolean },
  ): Promise<ApiResultListWithTotal<T>>;

  assetsGraph(
    query: ApiRequestList<AssetQueryWhere>,
    options?: { pid?: string },
  ): Promise<AssetsGraph>;
  assetsCreate(
    params: AssetCreateDTO,
    options?: { pid?: string },
  ): Promise<AssetsChangeResult>;
  assetsChange(
    params: AssetChangeDTO,
    options?: { pid?: string },
  ): Promise<AssetsChangeResult>;
  assetsChangeUndo(
    params: {
      changeId: string;
    },
    options?: { pid?: string },
  ): Promise<AssetsChangeResult>;
  assetsChangeBatch(
    params: {
      ops: AssetChangeBatchOpDTO[];
    },
    options?: { pid?: string },
  ): Promise<AssetsBatchChangeResultDTO>;
  assetsDelete(
    where: AssetWhereParams,
    options?: { pid?: string },
  ): Promise<AssetDeleteResultDTO>;
  assetsRestore(
    where: AssetWhereParams,
    options?: { pid?: string },
  ): Promise<AssetsChangeResult>;
  assetsCreateRef(
    params: CreateRefDTO,
    options?: { pid?: string },
  ): Promise<AssetReferencesResult>;
  assetsDeleteRef(
    params: CreateRefDTO,
    options?: { pid?: string },
  ): Promise<AssetDeleteRefResultDTO>;
  assetsMove(
    params: AssetMoveParams,
    options?: { pid?: string },
  ): Promise<AssetMoveResult>;
  assetsGetHistory(
    assetId: string,
    options?: { pid?: string },
  ): Promise<ApiResultListWithMore<AssetHistoryDTO>>;
  getAssetLocalPath(
    asset_id: string,
    options?: { pid?: string },
  ): Promise<string | null>;
}

export interface IProjectDatabaseWorkspace {
  workspacesGet(
    query: ApiRequestList<WorkspaceQueryDTOWhere>,
    options?: { pid?: string },
  ): Promise<ApiResultListWithTotal<Workspace>>;
  workspacesCreate(
    params: ChangeWorkspaceRequest,
    options?: { pid?: string },
  ): Promise<Workspace>;
  workspacesChange(
    workspace_id: string,
    params: ChangeWorkspaceRequest,
    options?: { pid?: string },
  ): Promise<Workspace>;
  workspacesDelete(
    workspace_id: string,
    options?: { pid?: string },
  ): Promise<void>;
  workspacesMove(
    params: WorkspaceMoveParams,
    options?: { pid?: string },
  ): Promise<WorkspaceMoveResult>;
  getWorkspaceLocalPath(
    workspace_id: string,
    options?: { pid?: string },
  ): Promise<string | null>;
}

export type IProjectDatabaseEventHandler = {
  cancel: () => void;
  isConnected: () => boolean;
  listenContent: (asset_ids: string[], workspace_ids: string[]) => void;
};

export interface IProjectDatabase
  extends IProjectDatabaseAsset,
    IProjectDatabaseWorkspace {
  subscribeEvents(
    pid: string,
    callback: (changes: ProjectContentChangeEventArg) => void,
  ): IProjectDatabaseEventHandler;
}
