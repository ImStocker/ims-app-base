import { AppSubManagerBase } from './IAppManager';
import type {
  ProjectFullInfo,
  IProjectUserOwnRole,
  ProjectImportResponseDTO,
  ChangesStreamRequest,
  ChangesStreamResponse,
  ApiResultListWithTotal,
} from '../types/ProjectTypes';
import CreatorAssetManager from './CreatorAssetManager';
import Subscriber from '../types/Subscriber';
import type { AssetShort } from '../types/AssetsType';
import type { Workspace } from '../types/Workspaces';
import { openBlobFile } from '../utils/dataUtils';
import { Service, HttpMethods } from './ApiWorker';
import ApiManager from './ApiManager';
import type {
  ProjectRightsInspectResponseDTO,
  RoleAssetRightsChangeDTOOne,
  RoleWorkspaceRightsChangeDTOOne,
  RoleWorkspaceRightsGetDTO,
} from '../types/RightsAndRoles';
import { EntityCache } from '#logic/types/EntityCache';
import { assert } from '#logic/utils/typeUtils';

export type IProjectInfo = ProjectFullInfo;

export type ProjectChangeEventArg = {
  oldProjectId: string | null;
  newProjectId: string | null;
};

export default class ProjectManager extends AppSubManagerBase {
  private _projectInfo: ProjectFullInfo | null = null;
  private _userRole: IProjectUserOwnRole | null = null;
  private _fullProjectsCache: EntityCache<ProjectFullInfo> | undefined;

  changeProjectSubscriber = new Subscriber<[ProjectChangeEventArg]>();

  async init() {
    this._fullProjectsCache = new EntityCache<ProjectFullInfo>({
      key: 'id',
      ttl: 1000 * 60 * 10,
      loadFunc: async (project_ids) => {
        const res: ProjectFullInfo[] = [];
        for (const project_id of project_ids) {
          const project_full_info = await this.getProjectFullInfo(project_id);
          if (project_full_info) {
            res.push(project_full_info);
          }
        }
        return res;
      },
    });
  }

  setCurrentProjectInfo(
    project_info: ProjectFullInfo | null,
    user_role: IProjectUserOwnRole | null,
  ) {
    const old_project_id = this._projectInfo ? this._projectInfo.id : null;
    this._projectInfo = project_info;
    this._userRole = user_role;
    if (project_info) {
      this.appManager
        .get(CreatorAssetManager)
        .updateWorkspacesCache(project_info.rootWorkspaces);
    }
    this.changeProjectSubscriber.notify({
      oldProjectId: old_project_id,
      newProjectId: project_info ? project_info.id : null,
    });
  }

  getAllowAnonymUsers() {
    return false;
  }

  getProjectFullInfoViaCache(projectId: string) {
    assert(this._fullProjectsCache, 'Not inited');
    return this._fullProjectsCache.getElement(projectId);
  }

  getProjectFullInfoViaCacheSync(projectId: string) {
    assert(this._fullProjectsCache, 'Not inited');
    return this._fullProjectsCache.getElementSync(projectId);
  }

  async requestProjectFullInfoInCache(projectId: string) {
    await this.getProjectFullInfoViaCache(projectId);
  }

  getWorkspaceByName(workspace_name: string) {
    const workspace = this.appManager
      .get(CreatorAssetManager)
      .getWorkspaceByNameViaCacheSync(workspace_name, false);
    return workspace;
  }

  getWorkspaceIdByName(workspace_name: string) {
    const workspace = this.getWorkspaceByName(workspace_name);
    return workspace ? workspace.id : null;
  }

  getProjectInfo(): ProjectFullInfo | null {
    return this._projectInfo;
  }

  getUserRoleInProject(): IProjectUserOwnRole | null {
    return this._userRole;
  }

  canCreateAssets(): boolean {
    if (!this.getAllowAnonymUsers()) {
      if (!this._userRole) return false;
    }
    if (!this._projectInfo) return false;
    return true;
  }

  canCreateWorkspaces(): boolean {
    if (!this._userRole) return false;
    if (!this._projectInfo) return false;
    return true;
  }

  canCreateTask(): boolean {
    return false;
  }

  isAdmin() {
    return this._userRole && this._userRole.isAdmin;
  }

  async exportWorkspace(
    workspace: Workspace,
    params?: Record<string, any>,
  ): Promise<void> {
    const res = await this.appManager
      .get(ApiManager)
      .download(Service.CREATORS, HttpMethods.GET, 'project/export', {
        workspace_id: workspace.id,
        ...params,
      });

    const file_title = `${workspace.name ? workspace.name : workspace.title}.zip`;
    await openBlobFile(new Blob([res]), file_title);
  }

  async exportAsset(
    asset: AssetShort,
    params?: Record<string, any>,
  ): Promise<void> {
    const res = await this.appManager
      .get(ApiManager)
      .download(
        Service.CREATORS,
        HttpMethods.GET,
        `project/export/asset/${asset.id}`,
        {
          use_names: params?.use_names,
        },
      );
    const file_title = `${asset.name ? asset.name : asset.title}.ima.json`;
    await openBlobFile(new Blob([res]), file_title);
  }

  async importFile(
    file: Blob,
    name: string,
    workspace_id?: string | null,
  ): Promise<ProjectImportResponseDTO> {
    const project_info = this.appManager.get(ProjectManager).getProjectInfo();
    if (!project_info) throw new Error('Project is not set');

    const formData = new FormData();
    formData.append('file', file, name);
    formData.append('pid', project_info.id);

    if (workspace_id === undefined) {
      workspace_id = this.getWorkspaceIdByName('gdd') ?? undefined;
    }
    return await this.appManager
      .get(ApiManager)
      .call(Service.CREATORS, HttpMethods.POST, 'project/import', formData, {
        workspace_id: workspace_id,
      });
  }

  async getProjectFullInfo(
    project_id?: string,
  ): Promise<ProjectFullInfo | null> {
    assert(this._fullProjectsCache, 'Not inited');
    const res: ProjectFullInfo = await this.appManager
      .get(ApiManager)
      .call(Service.CREATORS, HttpMethods.GET, 'project/info', {
        pid: project_id,
      });
    if (res) {
      this._fullProjectsCache.addToCache(res);
    }
    return res;
  }

  async reloadProjectSettings() {
    if (!this._projectInfo) return;
    const project_info = await this.getProjectFullInfo();
    if (project_info) {
      this._projectInfo.settings = project_info.settings;
    }
  }

  async getChangesStream(
    params: ChangesStreamRequest,
  ): Promise<ChangesStreamResponse> {
    return await this.appManager
      .get(ApiManager)
      .call<ChangesStreamResponse>(
        Service.CREATORS,
        HttpMethods.POST,
        'project/changes/stream/get',
        params,
      );
  }

  async getRights(
    _asset_id?: string,
    _workspace_id?: string,
  ): Promise<ProjectRightsInspectResponseDTO | undefined> {
    return;
  }

  async setWorkspaceRoleRightsList(
    _changes: RoleWorkspaceRightsChangeDTOOne[],
  ): Promise<ApiResultListWithTotal<RoleWorkspaceRightsGetDTO>> {
    return {
      list: [],
      total: 0,
    };
  }

  async setAssetRoleRightsList(
    _changes: RoleAssetRightsChangeDTOOne[],
  ): Promise<{ success: true }> {
    return {
      success: true,
    };
  }

  async loadProjectTemplates() {
    if (this.appManager.$env.PROJECT_TEMPLATES_LINK) {
      const res = await fetch(this.appManager.$env.PROJECT_TEMPLATES_LINK);
      return await res.json();
    }
    return [];
  }
}
