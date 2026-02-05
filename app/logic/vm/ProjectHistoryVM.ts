import CreatorAssetManager from '../managers/CreatorAssetManager';
import type { IAppManager } from '../managers/IAppManager';
import ProjectManager from '../managers/ProjectManager';
import type { AssetGlobalHistoryDTO } from '../types/AssetHistory';
import type { IProjectHistoryVM } from './IProjectHistoryVM';

const CHANGES_HISTORY_COUNT = 50;

export class ProjectHistoryVM implements IProjectHistoryVM {
  appManager: IAppManager;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadError: string | null;
  loadMoreError: any;
  projectId: string;
  globalChanges: AssetGlobalHistoryDTO[];

  constructor(appManager: IAppManager) {
    this.appManager = appManager;
    this.isLoading = true;
    this.isLoadingMore = false;
    this.loadError = null;
    this.loadMoreError = null;
    this.hasMore = false;
    this.projectId =
      this.appManager.get(ProjectManager).getProjectInfo()?.id ?? '';
    this.globalChanges = [];
  }

  getGlobalHistoryChanges() {
    return [...this.globalChanges];
  }

  private async _load() {
    const date_to =
      this.globalChanges && this.globalChanges.length > 0
        ? this.globalChanges[this.globalChanges.length - 1].createdAt
        : undefined;
    const where: { dateTo?: string } = {};
    const gdd_workspace_id = this.appManager
      .get(ProjectManager)
      .getWorkspaceIdByName('gdd');
    if (date_to) {
      where.dateTo = date_to;
    }
    if (gdd_workspace_id) {
      const res = await this.appManager
        .get(CreatorAssetManager)
        .getGlobalHistory(
          this.projectId,
          CHANGES_HISTORY_COUNT,
          { workspaceids: gdd_workspace_id },
          where,
        );
      this.hasMore = res.more;
      this.globalChanges = [...this.globalChanges, ...res.list];
    }
  }

  async loadMoreChanges(): Promise<void> {
    try {
      this.isLoadingMore = true;
      await this._load();
      this.isLoadingMore = false;
    } catch (error: any) {
      this.loadMoreError = error.message.toString();
      this.isLoadingMore = false;
    }
  }

  async load() {
    try {
      this.isLoading = true;
      await this._load();
      this.isLoading = false;
    } catch (err: any) {
      this.loadError = err.message.toString();
    }
  }
}
