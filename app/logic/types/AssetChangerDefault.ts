import CreatorAssetManager from '../managers/CreatorAssetManager';
import type { IAppManager } from '../managers/IAppManager';
import {
  AssetChanger,
  type HistorySaveRequest,
  type HistorySaveResponse,
} from './AssetChanger';
import type { AssetChangeBatchOpDTO } from './AssetsType';
import {
  copyAssetFullData,
  type AssetFullInstanceR,
} from './AssetFullInstance';

export class AssetChangerDefault extends AssetChanger {
  constructor(
    public appManager: IAppManager,
    private _assetFull: AssetFullInstanceR | null,
    private _customProjectId: string | null = null,
  ) {
    super();
  }

  protected override async _saveChangesImpl(
    requests: HistorySaveRequest[],
    extraOps?: AssetChangeBatchOpDTO[],
  ): Promise<HistorySaveResponse> {
    const response: HistorySaveResponse = {
      originals: [],
    };
    if (!this._assetFull) return response;
    const options = this._customProjectId ? { pid: this._customProjectId } : {};
    let pending_extra_ops = extraOps && extraOps.length > 0 ? extraOps : null;
    for (const request of requests) {
      if (request.assetId !== this._assetFull.id) continue;
      const original = copyAssetFullData(this._assetFull);
      response.originals.push(original);
      if (pending_extra_ops) {
        const ops: AssetChangeBatchOpDTO[] = request.changes.map((change) => ({
          where: { id: [request.assetId] },
          set: change,
        }));
        ops.push(...pending_extra_ops);
        pending_extra_ops = null;
        await this.appManager
          .get(CreatorAssetManager)
          .changeAssetsBatch({ ops }, options);
      } else {
        await this.appManager
          .get(CreatorAssetManager)
          .makeAssetMultipleChange(
            { id: [original.id] },
            request.changes,
            options,
          );
      }
    }
    return response;
  }
}
