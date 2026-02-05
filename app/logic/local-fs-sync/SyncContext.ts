import { assert } from '../utils/typeUtils';
import { SyncTargetFileNotFound, type ISyncTarget } from './ISyncTarget';
import type { SyncExportSegment } from './SyncExportSegment';
import type { SyncLocalRootIndex, SyncLocalRootInfo } from './SyncLocalRoot';

export type SyncContextMessage = {
  type: 'info' | 'warn' | 'error';
  date: Date;
  message: string;
};

export const SYNC_ROOT_INDEX_FILENAME = 'index.json';

export class SyncContext {
  public messages: SyncContextMessage[] = [];
  public rootIndex: SyncLocalRootIndex | null = null;

  constructor(
    public projectId: string,
    public segments: SyncExportSegment[],
  ) {}

  public logError(message: string | Error) {
    this.messages.push({
      type: 'error',
      date: new Date(),
      message: message.toString(),
    });
  }

  public async readRootInfo(target: ISyncTarget): Promise<SyncLocalRootInfo> {
    this.rootIndex = {
      imsProjectId: this.projectId,
      segments: this.segments.map((s) => s.info),
      segmentStates: {},
    };

    let data_str: string;
    try {
      data_str = await target.readTextFile(SYNC_ROOT_INDEX_FILENAME);
    } catch (err: any) {
      if (err instanceof SyncTargetFileNotFound) {
        // Not found

        // Check folder is empty
        if (!(await target.isEmpty())) {
          return {
            index: this.rootIndex,
            status: 'badContent',
          };
        }

        return {
          index: this.rootIndex,
          status: 'new',
        };
      } else throw err;
    }

    const data_parsed = JSON.parse(data_str);
    this.rootIndex = data_parsed;
    assert(this.rootIndex);
    if (!this.rootIndex.imsProjectId) {
      return {
        index: this.rootIndex,
        status: 'badContent',
      };
    } else if (this.rootIndex.imsProjectId !== this.projectId) {
      return {
        index: this.rootIndex,
        status: 'badProject',
      };
    }
    return {
      index: this.rootIndex,
      status: 'ok',
    };
  }

  public async saveRootInfo(target: ISyncTarget): Promise<void> {
    await target.putFile(
      SYNC_ROOT_INDEX_FILENAME,
      new Blob([JSON.stringify(this.rootIndex)]),
    );
  }
}
