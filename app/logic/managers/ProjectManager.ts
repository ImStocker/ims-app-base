import { AppSubManagerBase, type IAppManager } from './IAppManager';
import type {
  ProjectFullInfo,
  IProjectUserOwnRole,
  UserInProject,
} from '../types/ProjectTypes';
import { Service, HttpMethods } from './ApiWorker';
import ApiManager from './ApiManager';
import { EntityCache } from '#logic/types/EntityCache';
import { assert } from '#logic/utils/typeUtils';
import type { IProjectContext } from '#logic/types/IProjectContext';
import type { ProjectContext } from '#logic/types/ProjectContext';

export type ProjectChangeEventArg = {
  oldProjectId: string | null;
  newProjectId: string | null;
};

export type ProjectContextFabric = (
  appManager: IAppManager,
  projectInfo: ProjectFullInfo,
  user: UserInProject | null,
) => ProjectContext;

export default class ProjectManager extends AppSubManagerBase {
  private _userRole: IProjectUserOwnRole | null = null;
  private _projectContextFabric: ProjectContextFabric | null = null;
  protected _fullProjectsCache: EntityCache<ProjectFullInfo> | undefined;

  async init(projectContextFabric: ProjectContextFabric) {
    this._projectContextFabric = projectContextFabric;
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

  getProjectContext(projectId: string): Promise<IProjectContext | null> {}

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
