import CreatorAssetManager from '../managers/CreatorAssetManager';
import type { IAppManager } from '../managers/IAppManager';
import {
  AssetChanger,
  type HistorySaveRequest,
  type HistorySaveResponse,
} from './AssetChanger';
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
  ): Promise<HistorySaveResponse> {
    const response: HistorySaveResponse = {
      originals: [],
    };
    if (!this._assetFull) return response;
    for (const request of requests) {
      if (request.assetId !== this._assetFull.id) continue;
      const original = copyAssetFullData(this._assetFull);
      response.originals.push(original);
      await this.appManager.get(CreatorAssetManager).makeAssetMultipleChange(
        {
          id: [original.id],
        },
        request.changes,
        this._customProjectId ? { pid: this._customProjectId } : {},
      );
    }
    return response;
  }
}
