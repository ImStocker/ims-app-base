import type { IAppManager } from '../managers/IAppManager';
import type { AssetPropWhere } from '../types/PropsWhere';
import type { ISyncTarget } from './ISyncTarget';
import type { SyncChunk } from './SyncChunk';
import type { SyncContext } from './SyncContext';
import type { SyncLocalRootSegment } from './SyncLocalRoot';

export interface SyncExportSegmentCtr<T extends SyncExportSegment> {
  Name: string;
  new (appManager: IAppManager, info: SyncLocalRootSegment): T;
}

export abstract class SyncExportSegment {
  static Name: string = '';
  static Version: string = '';

  constructor(
    public appManager: IAppManager,
    public info: SyncLocalRootSegment,
  ) {}

  abstract getVersion(): string;

  getAdditionalAssetFilter(): AssetPropWhere {
    return {};
  }

  needAssets(): boolean {
    return true;
  }

  needWorkspaces(): boolean {
    return false;
  }

  forceFullSync(): boolean {
    return false;
  }

  abstract sync(
    context: SyncContext,
    target: ISyncTarget,
    chunk: SyncChunk,
  ): Promise<void>;

  async finalizeSync(
    _context: SyncContext,
    _target: ISyncTarget,
  ): Promise<void> {}

  async init(context: SyncContext, target: ISyncTarget): Promise<ISyncTarget> {
    return await target.putFolder(this.info.saveAs);
  }
  async destroy(context: SyncContext, target: ISyncTarget): Promise<void> {
    await target.deleteFolder(this.info.saveAs);
  }
}
