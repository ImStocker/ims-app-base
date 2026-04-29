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
  ): Promise<AssetsShortResult>;
  assetsGetFull(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<AssetsFullResult>;

  assetsGetView<T extends AssetProps>(
    query: AssetPropsSelection,
    options?: { folded: false },
  ): Promise<ApiResultListWithTotal<T>>;
  assetsGetView<T extends AssetPropsPlainObject>(
    query: AssetPropsSelection,
    options: { folded: true } | { folded: boolean },
  ): Promise<ApiResultListWithTotal<T>>;

  assetsGraph(query: ApiRequestList<AssetQueryWhere>): Promise<AssetsGraph>;
  assetsCreate(params: AssetCreateDTO): Promise<AssetsChangeResult>;
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
  assetsCreateRef(params: CreateRefDTO): Promise<AssetReferencesResult>;
  assetsDeleteRef(params: CreateRefDTO): Promise<AssetDeleteRefResultDTO>;
  assetsMove(params: AssetMoveParams): Promise<AssetMoveResult>;
  assetsGetHistory(
    assetId: string,
  ): Promise<ApiResultListWithMore<AssetHistoryDTO>>;
  getAssetLocalPath(asset_id: string): Promise<string | null>;
}

export interface IProjectDatabaseWorkspace {
  workspacesGet(
    query: ApiRequestList<WorkspaceQueryDTOWhere>,
  ): Promise<ApiResultListWithTotal<Workspace>>;
  workspacesCreate(params: ChangeWorkspaceRequest): Promise<Workspace>;
  workspacesChange(
    workspace_id: string,
    params: ChangeWorkspaceRequest,
  ): Promise<Workspace>;
  workspacesDelete(workspace_id: string): Promise<void>;
  workspacesMove(params: WorkspaceMoveParams): Promise<WorkspaceMoveResult>;
  getWorkspaceLocalPathFolder(workspace_id: string): Promise<string | null>;
}

export type IProjectDatabaseCommentEventArgs = {
  cId: string;
  t: 'new' | 'change' | 'delete' | 'like';
  rId: string;
  instigator: number | null;
};

export type IProjectDatabaseCommentEventHandler = {
  cancel: () => void;
};

export type IProjectDatabaseEventHandler = {
  cancel: () => void;
  isConnected: () => boolean;
  listenContent: (asset_ids: string[], workpace_ids: string[]) => void;
  listenComment: (
    comment_id: string,
    callback: (ev: IProjectDatabaseCommentEventArgs) => void,
  ) => IProjectDatabaseCommentEventHandler;
};

export interface IProjectDatabase
  extends IProjectDatabaseAsset,
    IProjectDatabaseWorkspace {
  subscribeEvents(
    pid: string,
    callback: (changes: ProjectContentChangeEventArg) => void,
  ): IProjectDatabaseEventHandler;
}
