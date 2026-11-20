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
    if (!this._assetFull) {
      // Changes exist (the caller only saves when there are any) but the
      // editor is gone — the save pointers still advance, so without a
      // trace these changes would be dropped completely silently.
      console.warn(
        'AssetChanger: dropping save for asset',
        requests.map((r) => r.assetId).join(', '),
        '— editor is not bound to an asset',
      );
      return response;
    }
    const options = this._customProjectId ? { pid: this._customProjectId } : {};
    let pending_extra_ops = extraOps && extraOps.length > 0 ? extraOps : null;
    for (const request of requests) {
      if (request.assetId !== this._assetFull.id) {
        // The save pointers still advance past these changes — without a
        // trace they would be dropped completely silently.
        console.warn(
          'AssetChanger: dropping save request for asset',
          request.assetId,
          '— editor is bound to',
          this._assetFull.id,
        );
        continue;
      }
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
