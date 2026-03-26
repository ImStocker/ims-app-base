import { PageVMBase } from '../types/PageVMBase';
import type { SubscriberHandler } from '../types/Subscriber';
import { GameDesignMenuVM } from './GameDesignMenuVM';
import ProjectManager from '../managers/ProjectManager';
import { openProjectLink } from '../router/routes-helpers';
import { assert } from '../utils/typeUtils';
import type { AssetPropWhere } from '../types/PropsWhere';
import type { ProjectContentChangeEventArg } from '#logic/types/IProjectDatabase';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';

export type WorkspacePageVMParams = {
  searchQuery: AssetPropWhere;
};

export class WorkspacePageVM extends PageVMBase<WorkspacePageVMParams> {
  protected _workspaceEventsSubscriber: SubscriberHandler | null = null;
  gameDesignMenuVM: GameDesignMenuVM;
  isLoading = true;
  loadError: string | null = null;
  searchQuery: AssetPropWhere;
  projectContext: IProjectContext;

  constructor(projectContext: IProjectContext, params: WorkspacePageVMParams) {
    super(projectContext.appManager, params);
    this.projectContext = projectContext;
    this.searchQuery = params.searchQuery;
    this.gameDesignMenuVM = new GameDesignMenuVM(
      projectContext,
      this.workspaceId ?? null,
    );
  }

  get workspaceId(): string | null {
    if (this.searchQuery) {
      for (const field of ['workspaceid', 'workspaceids']) {
        if (typeof this.searchQuery[field] === 'string') {
          return this.searchQuery[field];
        } else if (
          Array.isArray(this.searchQuery[field]) &&
          this.searchQuery[field].length === 1 &&
          typeof this.searchQuery[field][0] === 'string'
        ) {
          return this.searchQuery[field][0];
        }
      }
    }
    return null;
  }

  get workspace() {
    if (!this.workspaceId) return null;
    return this.projectContext
      .get(AssetSubContext)
      .getWorkspaceByIdViaCacheSync(this.workspaceId);
  }

  get workspaceMenu() {
    return this.workspace
      ? this.gameDesignMenuVM.getWorkspaceMenu(this.workspace)
      : [];
  }

  async load() {
    try {
      this.isLoading = true;
      await this.gameDesignMenuVM.load();
      if (this.workspaceId) {
        await this.projectContext
          .get(AssetSubContext)
          .requestWorkspaceInCache(this.workspaceId);
      }
      this.isLoading = false;
    } catch (err: any) {
      this.loadError = err.message.toString();
      this.isLoading = false;
    }
  }

  async init() {
    this.gameDesignMenuVM.init();
    this._workspaceEventsSubscriber = this.projectContext
      .get(AssetSubContext)
      .projectContentEvents.subscribe(
        async (change_res) => await this._handleWorkspacesEvents(change_res),
      );
  }

  protected async _handleWorkspacesEvents(
    change_res: ProjectContentChangeEventArg,
  ) {
    if (!this.workspaceId) return;
    const projectInfo = this.appManager.get(ProjectManager).getProjectInfo();
    assert(projectInfo, 'Project is not loaded');

    if (change_res.wDelIds.includes(this.workspaceId)) {
      openProjectLink(
        this.appManager,
        {
          id: projectInfo.id,
          title: projectInfo.title,
        },
        {
          name: 'project-workspace-by-name',
          params: {
            workspaceName: 'gdd',
          },
        },
      );
      return;
    }
  }

  toJSON(): Record<string, any> {
    return {
      params: this.params,
      workspace: this.workspace,
      gameDesignMenuVM: this.gameDesignMenuVM.toJSON(),
      isLoading: this.isLoading,
      loadError: this.loadError,
    };
  }

  loadJSON(data: Record<string, any>): void {
    this._params = data.params;
    this.gameDesignMenuVM.loadJSON(data.gameDesignMenuVM);
    this.isLoading = data.isLoading;
    this.loadError = data.loadError;
  }

  destroy() {
    this.gameDesignMenuVM.destroy();
    if (this._workspaceEventsSubscriber) {
      this._workspaceEventsSubscriber.unsubscribe();
      this._workspaceEventsSubscriber = null;
    }
  }
}
