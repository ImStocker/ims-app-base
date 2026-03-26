import { AppSubManagerBase } from './IAppManager';
import type {
  ProjectFullInfo,
  IProjectUserOwnRole,
} from '../types/ProjectTypes';
import CreatorAssetManager from './CreatorAssetManager';
import Subscriber from '../types/Subscriber';
import { Service, HttpMethods } from './ApiWorker';
import ApiManager from './ApiManager';
import { EntityCache } from '#logic/types/EntityCache';
import { assert } from '#logic/utils/typeUtils';
import type { IProjectContext } from '#logic/types/IProjectContext';

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
          const project_full_info = await this.loadProjectFullInfo(project_id);
          if (project_full_info) {
            res.push(project_full_info);
          }
        }
        return res;
      },
    });
  }

  getCurrentProjectContext(): IProjectContext | null {}

  getProjectContext(projectId: string): Promise<IProjectContext | null> {}

  setCurrentProjectInfo(
    project_info: ProjectFullInfo | null,
    user_role: IProjectUserOwnRole | null,
  ) {
    assert(this._fullProjectsCache, 'Not inited');
    if (project_info) {
      this._fullProjectsCache.addToCache(project_info);
    }
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

  /*
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
*/
  getProjectInfo(): ProjectFullInfo | null {
    return this._projectInfo;
  }

  getUserRoleInProject(): IProjectUserOwnRole | null {
    return this._userRole;
  }

  canCreateTask(): boolean {
    return false;
  }

  isAdmin() {
    return this._userRole && this._userRole.isAdmin;
  }

  async loadProjectFullInfo(
    project_id: string,
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

  async loadProjectTemplates() {
    if (this.appManager.$env.PROJECT_TEMPLATES_LINK) {
      const res = await fetch(this.appManager.$env.PROJECT_TEMPLATES_LINK);
      return await res.json();
    }
    return [];
  }
}
