import JSZip from 'jszip/dist/jszip.min.js';
import ConfirmDialog from '../../components/Common/ConfirmDialog.vue';
import type { ISyncTarget } from '../local-fs-sync/ISyncTarget';
import type { SyncChunk } from '../local-fs-sync/SyncChunk';
import {
  SYNC_ROOT_INDEX_FILENAME,
  SyncContext,
} from '../local-fs-sync/SyncContext';
import type {
  SyncExportSegment,
  SyncExportSegmentCtr,
} from '../local-fs-sync/SyncExportSegment';
import type { SyncLocalRootSegment } from '../local-fs-sync/SyncLocalRoot';
import { FsSyncTarget } from '../local-fs-sync/targets/FsSyncTarget';
import { ZipSyncTarget } from '../local-fs-sync/targets/ZipSyncTarget';
import type { ProjectFullInfo } from '../types/ProjectTypes';
import {
  castAssetPropValueToFloat,
  castAssetPropValueToString,
  type AssetPropValueSelection,
} from '../types/Props';
import { AssetPropWhereOpKind, type AssetPropWhere } from '../types/PropsWhere';
import type { WorkspaceQueryDTOWhere } from '../types/Workspaces';
import { assert } from '../utils/typeUtils';
import CreatorAssetManager from './CreatorAssetManager';
import DialogManager from './DialogManager';
import { AppSubManagerBase } from './IAppManager';
import ProjectManager from './ProjectManager';
import UiManager from './UiManager';
import UiPreferenceManager from './UiPreferenceManager';
import type UserCodeExecuteManager from '../local-fs-sync/UserCodeExecuteManager';
import ExportFormatManager from './ExportFormatManager';
import { MemorySyncTarget } from '../local-fs-sync/targets/MemorySyncTarget';
import ProjectSettingsManager from './ProjectSettingsManager';

const SYNC_CHUNK_SIZE = 50;

function getProjectDb(projectId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('project-' + projectId, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as any).result;
      db.createObjectStore('handles', { keyPath: 'id' });
    };
    request.onsuccess = (event) => {
      resolve((event.target as any).result);
    };
    request.onerror = (event) => {
      reject((event.target as any).error);
    };
  });
}

async function saveDirHandle(
  projectId: string,
  key: string,
  dirHandle: FileSystemDirectoryHandle,
) {
  const db = await getProjectDb(projectId);
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['handles'], 'readwrite');
    const store = transaction.objectStore('handles');
    const request = store.put({ id: key, handle: dirHandle });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getDirHandle(
  projectId: string,
  key: string,
): Promise<FileSystemDirectoryHandle | undefined> {
  const db = await getProjectDb(projectId);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['handles'], 'readonly');
    const store = transaction.objectStore('handles');
    const request = store.get(key);
    request.onsuccess = (event) =>
      resolve((event.target as any).result?.handle);
    request.onerror = () => reject(request.error);
  });
}

const BC_NAME = 'imsLocalFsSync';
const BC_MESSAGE_SET_PRIMARY = 'setPrimary';
const BC_MESSAGE_ASK_PRIMARY = 'askPrimary';

export type SyncStatus = {
  isSyncing: boolean;
  isAuto: boolean;
  autoFatalError: string | null;
};

export type SegmentEntity = {
  name: string;
  controller: () => Promise<SyncExportSegmentCtr<SyncExportSegment>>;
};

export const ROOT_DIR_NAME = 'syncDir';

const AUTOEXPORT_DEBOUNCE_DURATION = 1000;

export default class LocalFsSyncManager extends AppSubManagerBase {
  private _syncWorkerId = Math.round(Math.random() * 10000000).toString();
  private _primarySyncWorkerId: string | null = null;
  private _broadcastChannel: BroadcastChannel | null = null;
  private _autoSyncRequested: boolean = false;
  private _userCodeExecutorManager: UserCodeExecuteManager | null = null;
  private _segmentEntities: SegmentEntity[] = [];

  private _syncDebounceTimer: NodeJS.Timeout | null = null;
  private _pendingAssetIds = new Set<string>();
  private _pendingWorkspaceIds = new Set<string>();

  public syncStatus: SyncStatus = {
    isSyncing: false,
    isAuto: false,
    autoFatalError: null,
  };

  public async init() {
    const UserCodeExecuteManager = (
      await import('../local-fs-sync/UserCodeExecuteManager')
    ).default;
    this._userCodeExecutorManager = new UserCodeExecuteManager(this.appManager);
  }

  registerSegment(segment: SegmentEntity) {
    this._segmentEntities.push(segment);
    return {
      cancel: () => {
        const ind = this._segmentEntities.indexOf(segment);
        if (ind >= 0) this._segmentEntities.splice(ind, 1);
      },
    };
  }

  getSegmentList() {
    return this._segmentEntities;
  }

  getSegmentsMap() {
    return new Map(this._segmentEntities.map((s) => [s.name, s]));
  }

  private _getSegmentAssetCondition(
    segment: SyncExportSegment,
  ): AssetPropWhere {
    const gdd_workspace_id = this.appManager
      .get(ProjectManager)
      .getWorkspaceIdByName('gdd');

    return {
      ...(segment.info.assetSelection?.Where ?? {}),
      _syncSegment: {
        op: AssetPropWhereOpKind.AND,
        v: [
          {
            ...segment.getAdditionalAssetFilter(),
            issystem: false,
            workspaceids: gdd_workspace_id ?? [],
          },
        ],
      },
    };
  }

  private _getSegmentWorkspaceCondition(segment: SyncExportSegment) {
    const gdd_workspace_id = this.appManager
      .get(ProjectManager)
      .getWorkspaceIdByName('gdd');
    const asset_condition = this._getSegmentAssetCondition(segment);
    return {
      insideId: gdd_workspace_id ?? null,
      hasAssets: asset_condition,
    };
  }

  private async _areIdsExporting(
    a_ids: string[],
    w_ids: string[],
  ): Promise<boolean> {
    if (!this._currentProject) return false;

    const context = await this._makeSyncContext(this._currentProject);
    for (const segment of context.segments) {
      const asset_condition: AssetPropWhere = {
        ...this._getSegmentAssetCondition(segment),
        _idFilter: {
          op: AssetPropWhereOpKind.AND,
          v: [
            {
              id: a_ids,
            },
          ],
        },
      };
      const asset_ids = await this.appManager
        .get(CreatorAssetManager)
        .getAssetsView({
          select: ['id'],
          where: asset_condition,
          count: 1,
        });
      if (asset_ids.list?.length) return true;

      const workspace_condition: WorkspaceQueryDTOWhere = {
        ...this._getSegmentWorkspaceCondition(segment),
        ids: w_ids,
      };
      const workspaces = await this.appManager
        .get(CreatorAssetManager)
        .getWorkspacesList({
          where: workspace_condition,
          count: 1,
        });
      if (workspaces.list.length) return true;
    }

    return false;
  }

  public initClient() {
    this.appManager
      .get(CreatorAssetManager)
      .projectContentEvents.subscribe((changes) => {
        const aDel = changes.aDelIds ?? [];
        const aUps = changes.aUpsIds ?? [];
        const wDel = changes.wDelIds ?? [];
        const wTch = changes.wTchIds ?? [];
        const wUps = changes.wUpsIds ?? [];
        for (const id of [...aDel, ...aUps]) {
          this._pendingAssetIds.add(id);
        }
        for (const id of [...wDel, ...wTch, ...wUps]) {
          this._pendingWorkspaceIds.add(id);
        }

        if (this._syncDebounceTimer !== null) {
          clearTimeout(this._syncDebounceTimer);
        }

        this._syncDebounceTimer = setTimeout(async () => {
          const need_sync = await this._areIdsExporting(
            Array.from(this._pendingAssetIds),
            Array.from(this._pendingWorkspaceIds),
          );
          if (need_sync) {
            this.autosync();
            this._primarySyncWorkerId = this._syncWorkerId; // Поменять, когда будет синхронизация по сокетам
          }
          this._pendingAssetIds.clear();
          this._pendingWorkspaceIds.clear();
          this._syncDebounceTimer = null;
        }, AUTOEXPORT_DEBOUNCE_DURATION);
      });
    const bc = new BroadcastChannel(BC_NAME);
    bc.onmessage = (ev) => {
      if (!ev.data || typeof ev.data !== 'object') return;
      if (!this._currentProjectId) return;
      if (this._currentProjectId !== ev.data.projectId) return;
      if (ev.data.name === BC_MESSAGE_ASK_PRIMARY) {
        if (this._primarySyncWorkerId === this._syncWorkerId) {
          bc.postMessage({
            name: BC_MESSAGE_SET_PRIMARY,
            workerId: this._syncWorkerId,
            projectId: this._currentProjectId,
          });
        }
      } else if (ev.data.name === BC_MESSAGE_SET_PRIMARY) {
        this._primarySyncWorkerId = ev.data.workerId;
      }
    };
    this._broadcastChannel = bc;

    const role = this.appManager.get(ProjectManager).getUserRoleInProject();
    if (this._currentProject && role) {
      if (this._syncDebounceTimer !== null) {
        clearTimeout(this._syncDebounceTimer);
      }

      this._syncDebounceTimer = setTimeout(async () => {
        this.autosync();
      }, AUTOEXPORT_DEBOUNCE_DURATION);
    }
  }

  public get autosyncEnabled(): boolean {
    return this.appManager
      .get(UiPreferenceManager)
      .getPreference<boolean>(
        'LocalFsSyncManager-autoSync-' + (this._currentProjectId ?? '0'),
        true,
      );
  }

  public set autosyncEnabled(val: boolean) {
    this.appManager
      .get(UiPreferenceManager)
      .setPreference(
        'LocalFsSyncManager-autoSync-' + (this._currentProjectId ?? '0'),
        val,
      );
  }

  private get _currentProject(): ProjectFullInfo | null {
    return this.appManager.get(ProjectManager).getProjectInfo();
  }

  private get _currentProjectId(): string | null {
    return this._currentProject ? this._currentProject.id : null;
  }

  private async _findOutPrimaryWorker(): Promise<boolean> {
    if (!this._broadcastChannel) return false;

    if (this._primarySyncWorkerId) {
      if (this._primarySyncWorkerId === this._syncWorkerId) {
        this._broadcastChannel.postMessage({
          name: BC_MESSAGE_SET_PRIMARY,
          workerId: this._syncWorkerId,
          projectId: this._currentProjectId,
        });
        return true;
      }
    }

    this._primarySyncWorkerId = null;
    this._broadcastChannel.postMessage({
      name: BC_MESSAGE_ASK_PRIMARY,
      projectId: this._currentProjectId,
    });
    await new Promise((res) => setTimeout(res, 1));
    if (this._primarySyncWorkerId) {
      return this._primarySyncWorkerId === this._syncWorkerId;
    }

    this._primarySyncWorkerId = this._syncWorkerId;
    this._broadcastChannel.postMessage({
      name: BC_MESSAGE_SET_PRIMARY,
      workerId: this._syncWorkerId,
      projectId: this._currentProjectId,
    });
    await new Promise((res) => setTimeout(res, 1));

    if (this._primarySyncWorkerId === this._syncWorkerId) {
      return true;
    } else return false;
  }

  public async autosync() {
    if (!this.autosyncEnabled) {
      return false;
    }

    const is_primary = await this._findOutPrimaryWorker();
    if (!is_primary) return false;

    if (!this._currentProject) return false;

    const rootDirHandle = await this.getDirHandle(ROOT_DIR_NAME);
    if (!rootDirHandle) {
      return false;
    }

    if (this.syncStatus.isSyncing) {
      this._autoSyncRequested = true;
      return null;
    }

    try {
      this.syncStatus.isAuto = true;
      const syncTarget = this.createFsSyncTarget(rootDirHandle);
      const context = await this._makeSyncContext(this._currentProject);
      const res = await this._syncImpl(context, syncTarget, false);
      if (res === false) {
        this.autosyncEnabled = false;
      }
      return res;
    } finally {
      this.syncStatus.isAuto = false;
    }
  }

  private async _makeSyncContext(
    project: ProjectFullInfo,
    config?: SyncLocalRootSegment,
  ): Promise<SyncContext> {
    const segmentsMap = this.getSegmentsMap();

    const segments: SyncExportSegment[] = [];
    {
      const segmentsInfos: SyncLocalRootSegment[] = config
        ? [config]
        : this.getExportConfigurations();
      const formats = this.appManager
        .get(ExportFormatManager)
        .getExportFormats();

      for (const si of segmentsInfos) {
        const format = formats.find((el) => el.id === si.formatId);
        assert(format, 'Format is not defined');
        const segment_entity = segmentsMap.get(format.segmentType);
        if (segment_entity) {
          const segment_controller = await segment_entity.controller();
          segments.push(new segment_controller(this.appManager, si));
        }
      }
    }
    return new SyncContext(project.id, segments);
  }

  async requestDirHandle(): Promise<any | null> {
    try {
      const rootDirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });
      if (!rootDirHandle) {
        return null;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
    return;
  }

  async saveDirHandle(key: string, rootDirHandle: any): Promise<void> {
    if (!this._currentProject) {
      throw new Error('No project selected');
    }
    await saveDirHandle(this._currentProject.id, key, rootDirHandle);
  }

  async getDirHandle(key: string): Promise<any> {
    if (!this._currentProject) {
      throw new Error('No project selected');
    }
    return await getDirHandle(this._currentProject.id, key);
  }
  createFsSyncTarget(rootDirHandle: any): ISyncTarget {
    return new FsSyncTarget(rootDirHandle);
  }

  public async sync(full = false, progress?: (p: number) => void) {
    if (!window.showDirectoryPicker) {
      throw new Error(this.appManager.$t('sync.fsSync.browserNotSupported'));
    }

    const rootDirHandle = await this.requestDirHandle();
    if (!rootDirHandle) {
      return false;
    }
    if (!this._currentProject) {
      throw new Error('No project selected');
    }

    await this.saveDirHandle(ROOT_DIR_NAME, rootDirHandle);

    const syncTarget = this.createFsSyncTarget(rootDirHandle);
    const context = await this._makeSyncContext(this._currentProject);
    return await this._syncImpl(context, syncTarget, full, progress);
  }

  public async createArchive(
    progress?: (p: number) => void,
  ): Promise<JSZip | null> {
    if (!this._currentProject) {
      throw new Error('No project selected');
    }

    const zip = new JSZip();
    const syncTarget = new ZipSyncTarget(zip);
    const context = await this._makeSyncContext(this._currentProject);
    const res = await this._syncImpl(context, syncTarget, true, progress);
    return res ? zip : null;
  }

  public async exportOne(
    config: SyncLocalRootSegment,
    progress?: (p: number) => void,
  ): Promise<{
    content: Blob;
    name: string;
  } | null> {
    if (!this._currentProject) {
      throw new Error('No project selected');
    }

    const syncTarget = new MemorySyncTarget();
    const context = await this._makeSyncContext(this._currentProject, config);
    const segment = context.segments[0];
    if (!segment) return null;

    const res = await this._syncImpl(context, syncTarget, true, progress);
    if (!res) return null;

    syncTarget.content.delete(SYNC_ROOT_INDEX_FILENAME);
    const sync_result = [...syncTarget.content.values()][0];
    if (!sync_result) return null; // Sync empty

    let content: Blob;
    let name: string;
    if (sync_result.type === 'folder') {
      const zip = new JSZip();

      const put_folder = (from: MemorySyncTarget, folder_prefix: string) => {
        for (const entry of from.content.values()) {
          if (entry.type === 'file') {
            zip.file(folder_prefix + entry.name, entry.content);
          } else {
            put_folder(entry.content, folder_prefix + entry.name + '/');
          }
        }
      };

      put_folder(sync_result.content, '');

      content = await zip.generateAsync({ type: 'blob' });
      name = sync_result.name + '.zip';
    } else {
      content = sync_result.content;
      name = sync_result.name;
    }

    return {
      content,
      name,
    };
  }

  private async _syncImpl(
    context: SyncContext,
    syncTarget: ISyncTarget,
    full = false,
    progress?: (p: number) => void,
  ): Promise<boolean | null> {
    this.syncStatus.isSyncing = true;
    try {
      const segmentsMap = this.getSegmentsMap();

      const rootInfo = await context.readRootInfo(syncTarget);
      if (rootInfo.status === 'badContent') {
        this.appManager
          .get(UiManager)
          .showError(this.appManager.$t('fsSync.targetFolderNotEmpty'));
        return false;
      } else if (rootInfo.status === 'badProject') {
        this.appManager
          .get(UiManager)
          .showError(
            this.appManager.$t('fsSync.targetFolderBelongDifferentProject'),
          );
        return false;
      }

      // Check old content
      let delete_old = false;
      if (full) {
        delete_old = true;
      } else if (
        JSON.stringify(context.segments.map((s) => s.info)) !==
        JSON.stringify(rootInfo.index.segments)
      ) {
        const confirm = await this.appManager
          .get(DialogManager)
          .show(ConfirmDialog, {
            header: this.appManager.$t('fsSync.synchronization'),
            message: this.appManager.$t('fsSync.targetFolderHasDifferSegments'),
          });
        if (!confirm) return false;

        delete_old = true;
      }
      if (delete_old) {
        const old_segments_ctrl: SyncExportSegment[] = [];
        const formats = this.appManager
          .get(ExportFormatManager)
          .getExportFormats();
        for (const segment of rootInfo.index.segments) {
          const format = formats.find((el) => el.id === segment.formatId);
          assert(format, 'Format is not defined');
          const segment_entity = segmentsMap.get(format.segmentType);
          if (!segment_entity) {
            this.appManager
              .get(UiManager)
              .showError(
                this.appManager.$t('fsSync.cannotReinitialzeOldSegmentsMissed'),
              );
            return false;
          }
          const ctrl = await segment_entity.controller();
          old_segments_ctrl.push(new ctrl(this.appManager, segment));
          delete rootInfo.index.segmentStates[segment.id];
        }

        await Promise.all(
          old_segments_ctrl.map((ctrl) => ctrl.destroy(context, syncTarget)),
        );
      }

      if (progress) {
        progress(0.1);
      }
      rootInfo.index.segments = context.segments.map((s) => s.info);
      for (
        let segment_index = 0;
        segment_index < context.segments.length;
        segment_index++
      ) {
        const segment = context.segments[segment_index];
        if (context.projectId === this._currentProjectId) {
          const segment_res = await this._syncSegment(
            context,
            segment,
            syncTarget,
          );
          if (!segment_res) return null;
          if (progress) {
            progress(
              0.1 + (0.8 * (segment_index + 1)) / context.segments.length,
            );
          }
        } else return null;
      }

      if (context.projectId === this._currentProjectId) {
        await context.saveRootInfo(syncTarget);
      } else return null;

      if (progress) {
        progress(1);
      }

      if (this._autoSyncRequested) {
        this.autosync(); // No await;
      }

      return true;
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  private async _syncSegment(
    context: SyncContext,
    segment: SyncExportSegment,
    rootSyncTarget: ISyncTarget,
  ): Promise<boolean> {
    assert(context.rootIndex);
    const sync_at: string | null =
      context.rootIndex.segmentStates[segment.info.id]?.syncAt ?? null;

    const force_full = segment.forceFullSync();

    let syncTarget: ISyncTarget | null = null;

    const new_sync_at = new Date().toISOString();

    if (context.projectId !== this._currentProjectId) {
      return false;
    }

    // added for correct export when format asset type filter is empty
    if (segment.info.assetSelection?.Where?.typeids === null) {
      delete segment.info.assetSelection?.Where?.typeids;
    }

    const asset_condition: AssetPropWhere =
      this._getSegmentAssetCondition(segment);

    const workspace_condition: WorkspaceQueryDTOWhere =
      this._getSegmentWorkspaceCondition(segment);

    const has_any_changes = true;
    // if (sync_at) {
    //   let has_more = segment.needAssets() || segment.needWorkspaces();
    //   let last_asset_id = null as string | null;
    //   let last_workspace_id = null as string | null;
    //   let last_time = sync_at;
    //   while (has_more) {
    //     const changes = await this.appManager
    //       .get(ProjectManager)
    //       .getChangesStream({
    //         dateFrom: last_time,
    //         lastAssetId: last_asset_id ?? undefined,
    //         lastWorkspaceId: last_workspace_id ?? undefined,
    //         count: SYNC_CHUNK_SIZE,
    //         whereAssets: asset_condition,
    //         whereWorkspaces: workspace_condition,
    //       });
    //     has_more = !!changes.last && changes.more;
    //     if (changes.last) {
    //       last_time = changes.last.date;
    //       last_asset_id = changes.last.assetId;
    //       last_workspace_id = changes.last.workspaceId;
    //     }
    //     const chunk: SyncChunk = {
    //       assetDeletedIds: changes.assetDeletedIds,
    //       assetUpdatedIds: changes.assetUpdatedIds,
    //       workspaceDeletedIds: changes.workspaceDeletedIds,
    //       workspaceUpdatedIds: changes.workspaceUpdatedIds,
    //     };
    //     if (context.projectId !== this._currentProjectId) {
    //       return false;
    //     }

    //     if (
    //       !chunk.assetDeletedIds.length &&
    //       !chunk.assetUpdatedIds.length &&
    //       !chunk.workspaceDeletedIds.length &&
    //       !chunk.workspaceUpdatedIds.length
    //     ) {
    //       break;
    //     }

    //     if (force_full) {
    //       has_any_changes = true;
    //       has_more = false;
    //     } else {
    //       if (!syncTarget) {
    //         syncTarget = await segment.init(context, rootSyncTarget);
    //       }
    //       await segment.sync(context, syncTarget, chunk);
    //     }
    //   }
    // }

    if (!sync_at || (force_full && has_any_changes)) {
      if (sync_at) {
        await segment.destroy(context, rootSyncTarget);
      }
      syncTarget = await segment.init(context, rootSyncTarget);

      let asset_proccessed = 0;
      let workspace_proccessed = 0;
      let asset_has_more = segment.needAssets();
      let workspace_has_more = segment.needWorkspaces();

      while (asset_has_more || workspace_has_more) {
        const chunk: SyncChunk = {
          assetDeletedIds: [],
          assetUpdatedIds: [],
          workspaceDeletedIds: [],
          workspaceUpdatedIds: [],
        };
        if (segment.needAssets()) {
          const asset_ids = await this.appManager
            .get(CreatorAssetManager)
            .getAssetsView({
              select: ['id'],
              where: asset_condition,
              offset: asset_proccessed,
              count: SYNC_CHUNK_SIZE,
            });
          chunk.assetUpdatedIds = asset_ids.list.map((a) => a.id as string);
          asset_proccessed += asset_ids.list.length;
          asset_has_more =
            asset_proccessed < asset_ids.total && asset_ids.list.length > 0;
        }
        if (segment.needWorkspaces()) {
          const workspaces = await this.appManager
            .get(CreatorAssetManager)
            .getWorkspacesList({
              where: workspace_condition,
              count: SYNC_CHUNK_SIZE,
            });
          chunk.workspaceUpdatedIds = workspaces.list.map((w) => w.id);
          workspace_proccessed += workspaces.list.length;
          workspace_has_more = workspace_proccessed < workspaces.total;
        }

        if (context.projectId !== this._currentProjectId) {
          return false;
        }
        await segment.sync(context, syncTarget, chunk);
      }
    }
    if (context.projectId !== this._currentProjectId) {
      return false;
    }

    if (syncTarget) {
      await segment.finalizeSync(context, syncTarget);
    }

    if (context.projectId !== this._currentProjectId) {
      return false;
    }

    if (!context.rootIndex.segmentStates[segment.info.id]) {
      context.rootIndex.segmentStates[segment.info.id] = {
        syncAt: new_sync_at,
        version: segment.getVersion(),
      };
    } else {
      context.rootIndex.segmentStates[segment.info.id].syncAt = new_sync_at;
      context.rootIndex.segmentStates[segment.info.id].version =
        segment.getVersion();
    }

    return true;
  }

  public getExportConfigurations(): SyncLocalRootSegment[] {
    const configs = this.appManager
      .get(ProjectSettingsManager)
      .getValue<Record<string, any>>('sync-settings');
    if (!configs) return [];

    const res: SyncLocalRootSegment[] = [];
    for (const config of Object.values(configs)) {
      let asset_selection: AssetPropValueSelection | null = null;
      if (config.assetfilter || config.assetFilter) {
        asset_selection = config.assetfilter ?? null;
      } else if (config.assetSelection || config.assetselection) {
        asset_selection = config.assetSelection;
      }
      const segment: SyncLocalRootSegment = {
        id: castAssetPropValueToString(config.id),
        assetSelection: asset_selection,
        index: castAssetPropValueToFloat(config.index) ?? 0,
        saveAs: castAssetPropValueToString(config.saveAs ?? config.saveas),
        formatId: castAssetPropValueToString(
          config.formatId ?? config.formatid,
        ),
      };
      res.push(segment);
    }
    res.sort((a, b) => a.index - b.index);
    return res;
  }

  public async saveExportConfiguration(configuration: SyncLocalRootSegment) {
    await this.appManager
      .get(ProjectSettingsManager)
      .setValue('sync-settings', configuration.id, configuration);
  }

  public async deleteExportConfiguration(id: string) {
    await this.appManager
      .get(ProjectSettingsManager)
      .setValue('sync-settings', id, null);
  }

  public getUserCodeExecutorManager(): UserCodeExecuteManager {
    assert(this._userCodeExecutorManager, 'Not inited');
    return this._userCodeExecutorManager;
  }
}
