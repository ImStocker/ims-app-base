import type { InjectionKey } from 'vue';
import type { IAppManager } from '../managers/IAppManager';
import type { ProjectFullInfo, UserInProject } from './ProjectTypes';

/*
  TODO: REMOVE
export interface IProjectContextApi {
  getAssetShortViaCacheSync(assetId: string): AssetShort | null | undefined;
  getAssetShortViaCache(assetId: string): Promise<AssetShort | null>;
  requestAssetShortInCache(assetId: string, pid?: string): Promise<void>;
  getAssetShortsList(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<ApiResultListWithTotal<AssetShort>>;
  getAssetInstance(
    assetId: string,
    refresh?: boolean,
  ): Promise<AssetFullInstanceR | null>;

  getAssetInstancesList(
    query: ApiRequestList<AssetQueryWhere>,
    pid?: string,
  ): Promise<ApiResultListWithTotal<AssetFullInstanceR>>;

  checkHasChildrenViaCache(assetId: string): Promise<boolean | null>;

  getWorkspaceByIdViaCacheSync(
    workspace_id: string,
  ): Workspace | null | undefined;

  getWorkspaceByIdViaCache(workspace_id: string): Promise<Workspace | null>;

  getWorkspaceByNameViaCache(workspace_name: string): Promise<Workspace | null>;

  getWorkspacesList(
    query: ApiRequestList<WorkspaceQueryDTOWhere>,
  ): Promise<ApiResultListWithTotal<Workspace>>;
}*/

export const injectedProjectContext: InjectionKey<IProjectContext> =
  Symbol('projectContext');

export abstract class ProjectSubContext {
  public readonly projectContext: IProjectContext;

  constructor(projectContext: IProjectContext) {
    this.projectContext = projectContext;
  }
}

export type ProjectSubContextCtr<T extends ProjectSubContext> = abstract new (
  projectContext: IProjectContext,
  ...otherArgs: any[]
) => T;

export interface IProjectContext {
  get appManager(): IAppManager;
  get projectInfo(): ProjectFullInfo;
  get user(): UserInProject | null;

  get<R extends T, T extends ProjectSubContext = ProjectSubContext>(
    subcontext_interface: ProjectSubContextCtr<T>,
  ): R;

  register<T extends ProjectSubContext>(
    subcontext_interface: ProjectSubContextCtr<T>,
    subcontext: T,
  ): void;
  register<T extends ProjectSubContext>(subcontext: T): void;

  init(): Promise<void>;
  destroy(): Promise<void>;
  saveState(): Record<string, any>;
  loadState(state: Record<string, any>): void;
}

/*
export function makeProjectContextFromAppManager(
  appManager: IAppManager,
): IProjectContext {
  return {
    getAssetShortViaCacheSync(assetId: string) {
      return appManager
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(assetId);
    },
    getAssetShortViaCache(assetId: string) {
      return appManager.get(CreatorAssetManager).getAssetShortViaCache(assetId);
    },
    requestAssetShortInCache(assetId: string) {
      return appManager
        .get(CreatorAssetManager)
        .requestAssetShortInCache(assetId);
    },
    getAssetShortsList(query: ApiRequestList<AssetQueryWhere>) {
      return appManager.get(CreatorAssetManager).getAssetShortsList(query);
    },
    getAssetInstance(assetId: string, refresh?: boolean) {
      return appManager
        .get(CreatorAssetManager)
        .getAssetInstance(assetId, refresh);
    },
    get projectInfo() {
      const project_info = appManager.get(ProjectManager).getProjectInfo();
      assert(project_info);
      return project_info;
    },
    getAssetInstancesList(
      query: ApiRequestList<AssetQueryWhere>,
    ): Promise<ApiResultListWithTotal<AssetFullInstanceR>> {
      return appManager.get(CreatorAssetManager).getAssetInstancesList(query);
    },
    checkHasChildrenViaCache(assetId: string): Promise<boolean | null> {
      return appManager
        .get(CreatorAssetManager)
        .checkHasChildrenViaCache(assetId);
    },
    getWorkspaceByIdViaCacheSync(
      workspace_id: string,
    ): Workspace | null | undefined {
      return appManager
        .get(CreatorAssetManager)
        .getWorkspaceByIdViaCacheSync(workspace_id);
    },
    getWorkspaceByIdViaCache(workspace_id: string): Promise<Workspace | null> {
      return appManager
        .get(CreatorAssetManager)
        .getWorkspaceByIdViaCache(workspace_id);
    },
    getWorkspaceByNameViaCache(workspace_name: string) {
      return appManager
        .get(CreatorAssetManager)
        .getWorkspaceByNameViaCache(workspace_name);
    },
    getWorkspacesList(
      query: ApiRequestList<WorkspaceQueryDTOWhere>,
    ): Promise<ApiResultListWithTotal<Workspace>> {
      return appManager.get(CreatorAssetManager).getWorkspacesList(query);
    },
  };
}

export function makeProjectContextFromProjectInfo(
  appManager: IAppManager,
  projectFullInfo: ProjectFullInfo,
): IProjectContext {
  const isCurrentProject = () => {
    const current_project = appManager.get(ProjectManager).getProjectInfo();
    return current_project?.id === projectFullInfo.id;
  };
  return {
    getAssetShortViaCacheSync(assetId: string) {
      return appManager
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(assetId);
    },
    getAssetShortViaCache(assetId: string) {
      return appManager.get(CreatorAssetManager).getAssetShortViaCache(assetId);
    },
    requestAssetShortInCache(assetId: string) {
      return appManager
        .get(CreatorAssetManager)
        .requestAssetShortInCache(assetId);
    },
    getAssetShortsList(query: ApiRequestList<AssetQueryWhere>) {
      return appManager
        .get(CreatorAssetManager)
        .getAssetShortsList(
          query,
          isCurrentProject() ? undefined : { pid: projectFullInfo.id },
        );
    },
    getAssetInstance(assetId: string, refresh?: boolean) {
      return appManager
        .get(CreatorAssetManager)
        .getAssetInstance(
          assetId,
          refresh,
          isCurrentProject() ? undefined : { pid: projectFullInfo.id },
        );
    },
    get projectInfo() {
      return projectFullInfo;
    },
    getAssetInstancesList(
      query: ApiRequestList<AssetQueryWhere>,
    ): Promise<ApiResultListWithTotal<AssetFullInstanceR>> {
      return appManager
        .get(CreatorAssetManager)
        .getAssetInstancesList(
          query,
          isCurrentProject() ? undefined : { pid: projectFullInfo.id },
        );
    },
    checkHasChildrenViaCache(assetId: string): Promise<boolean | null> {
      return appManager
        .get(CreatorAssetManager)
        .checkHasChildrenViaCache(assetId);
    },
    getWorkspaceByIdViaCacheSync(
      workspace_id: string,
    ): Workspace | null | undefined {
      return appManager
        .get(CreatorAssetManager)
        .getWorkspaceByIdViaCacheSync(workspace_id);
    },
    getWorkspaceByIdViaCache(workspace_id: string): Promise<Workspace | null> {
      return appManager
        .get(CreatorAssetManager)
        .getWorkspaceByIdViaCache(workspace_id);
    },
    getWorkspaceByNameViaCache(
      workspace_name: string,
    ): Promise<Workspace | null> {
      return appManager
        .get(CreatorAssetManager)
        .getWorkspaceByNameViaCache(workspace_name);
    },
    getWorkspacesList(
      query: ApiRequestList<WorkspaceQueryDTOWhere>,
    ): Promise<ApiResultListWithTotal<Workspace>> {
      return appManager
        .get(CreatorAssetManager)
        .getWorkspacesList(
          query,
          isCurrentProject() ? undefined : { pid: projectFullInfo.id },
        );
    },
  };
}
*/
