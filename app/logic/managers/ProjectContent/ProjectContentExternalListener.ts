import { debounceForThis } from '#components/utils/ComponentUtils';
import type {
  IProjectDatabase,
  IProjectDatabaseCommentEventArgs,
  IProjectDatabaseCommentEventHandler,
  IProjectDatabaseEventHandler,
  ProjectContentChangeEventArg,
} from '#logic/types/IProjectDatabase';
import type CreatorAssetManager from '../CreatorAssetManager';

type ExpectEvents = {
  promise: Promise<{
    assetIds: string[];
    workspaceIds: string[];
  }>;
};

const EXPECT_EVENT_DELAY = 100;

export class ProjectContentExternalListener {
  private _handler: IProjectDatabaseEventHandler | null = null;

  private _pendingListenAssetIds: string[] = [];
  private _pendingListenWorkspaceIds: string[] = [];

  private _expectingMyEvents: ExpectEvents[] = [];

  private _listenAsAssetFullIds = new Set<string>();
  private readonly _requestListenContentDelayed: () => void;

  constructor(
    private _creatorsAssetManager: CreatorAssetManager,
    private _projectDatabase: IProjectDatabase,
    private _projectId: string,
    private _userId: number | null,
  ) {
    this._requestListenContentDelayed = debounceForThis(function () {
      (this as ProjectContentExternalListener)._requestListenContentImpl();
    }, 10);
  }

  private _requestListenContentImpl() {
    if (
      this._pendingListenAssetIds.length === 0 &&
      this._pendingListenWorkspaceIds.length === 0
    ) {
      return;
    }
    if (!this._handler) {
      return;
    }
    this._handler.listenContent(
      this._pendingListenAssetIds,
      this._pendingListenWorkspaceIds,
    );
    this._pendingListenAssetIds = [];
    this._pendingListenWorkspaceIds = [];
  }

  private async _filterExpectedChanges(
    changes: ProjectContentChangeEventArg,
  ): Promise<ProjectContentChangeEventArg> {
    if (
      changes.instigator !== this._userId ||
      this._expectingMyEvents.length === 0
    ) {
      return changes;
    }
    let all_expect_asset_ids: string[] = [];
    let all_expect_workpsace_ids: string[] = [];
    for (const exp of this._expectingMyEvents) {
      const exp_res = await exp.promise;
      all_expect_asset_ids = [...all_expect_asset_ids, ...exp_res.assetIds];
      all_expect_workpsace_ids = [
        ...all_expect_workpsace_ids,
        ...exp_res.workspaceIds,
      ];
    }
    const all_expect_asset_ids_set = new Set(all_expect_asset_ids);
    const all_expect_workpsace_ids_set = new Set(all_expect_workpsace_ids);

    return {
      aUpsIds: changes.aUpsIds.filter(
        (id) => !all_expect_asset_ids_set.has(id),
      ),
      aDelIds: changes.aDelIds.filter(
        (id) => !all_expect_asset_ids_set.has(id),
      ),
      wUpsIds: changes.wUpsIds.filter(
        (id) => !all_expect_workpsace_ids_set.has(id),
      ),
      wDelIds: changes.wDelIds.filter(
        (id) => !all_expect_workpsace_ids_set.has(id),
      ),
      wTchIds: changes.wTchIds.filter(
        (id) => !all_expect_workpsace_ids_set.has(id),
      ),
      instigator: changes.instigator,
    };
  }

  init() {
    this._handler = this._projectDatabase.subscribeEvents(
      this._projectId,
      async (changes) => {
        if (!this._projectDatabase) {
          return;
        }
        const filtered_changes = await this._filterExpectedChanges(changes);
        if (
          filtered_changes.aUpsIds.length === 0 &&
          filtered_changes.aDelIds.length === 0 &&
          filtered_changes.wUpsIds.length === 0 &&
          filtered_changes.wDelIds.length === 0 &&
          filtered_changes.wTchIds.length === 0
        ) {
          return;
        }
        if (filtered_changes.aUpsIds) {
          const need_full: string[] = [];
          const need_short: string[] = [];
          for (const asset_id of filtered_changes.aUpsIds) {
            if (this._listenAsAssetFullIds.has(asset_id)) {
              need_full.push(asset_id);
            } else {
              need_short.push(asset_id);
            }
          }
          if (need_full.length > 0) {
            const asset_full_res = await this._projectDatabase.assetsGetFull({
              where: {
                id: need_full,
              },
            });
            this._creatorsAssetManager.updateFullInstanceCache(
              asset_full_res,
              false,
            );
          }
          if (need_short.length > 0) {
            const asset_short_res = await this._projectDatabase.assetsGetShort({
              where: {
                id: need_short,
              },
            });
            this._creatorsAssetManager.updateShortAssetsCache(
              asset_short_res.list,
              false,
            );
          }
        }
        if (filtered_changes.wUpsIds) {
          const workpaces_res = await this._projectDatabase.workspacesGet({
            where: {
              ids: filtered_changes.wUpsIds,
            },
          });
          this._creatorsAssetManager.updateWorkspacesCache(
            workpaces_res.list,
            false,
          );
        }

        this._creatorsAssetManager.projectContentEvents.notify(
          filtered_changes,
        );
      },
    );
  }

  listenAssetShortIds(asset_ids: string[]) {
    this._pendingListenAssetIds = [
      ...this._pendingListenAssetIds,
      ...asset_ids,
    ];
    this._requestListenContentDelayed();
  }

  listenAssetFullIds(asset_ids: string[]) {
    this._pendingListenAssetIds = [
      ...this._pendingListenAssetIds,
      ...asset_ids,
    ];
    for (const asset_id of asset_ids) {
      this._listenAsAssetFullIds.add(asset_id);
    }
    this._requestListenContentDelayed();
  }

  listenWorkpaceIds(workspace_ids: string[]) {
    this._pendingListenWorkspaceIds = [
      ...this._pendingListenWorkspaceIds,
      ...workspace_ids,
    ];
    this._requestListenContentDelayed();
  }

  listenComment(
    comment_id: string,
    callback: (ev: IProjectDatabaseCommentEventArgs) => void,
  ): IProjectDatabaseCommentEventHandler {
    if (!this._handler) {
      throw new Error('Events not listening');
    }
    return this._handler.listenComment(comment_id, callback);
  }

  async expectMyEvents<T>(
    callback: () => T | Promise<T>,
    expect: (res: T) => { assetIds: string[]; workspaceIds: string[] },
  ): Promise<T> {
    const callback_res = Promise.resolve().then(() => callback());
    const exp: ExpectEvents = {
      promise: callback_res
        .then((res) => {
          return expect(res);
        })
        .catch(() => ({ assetIds: [], workspaceIds: [] })),
    };
    this._expectingMyEvents.push(exp);
    try {
      return await callback_res;
    } finally {
      setTimeout(() => {
        const ind = this._expectingMyEvents.indexOf(exp);
        if (ind >= 0) this._expectingMyEvents.splice(ind, 1);
      }, EXPECT_EVENT_DELAY);
    }
  }

  destroy() {
    if (this._handler) {
      this._handler.cancel();
      this._handler = null;
    }
  }
}
