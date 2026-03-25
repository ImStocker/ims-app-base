import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import {
  AssetChanger,
  type HistorySaveRequest,
  type HistorySaveResponse,
} from './AssetChanger';
import {
  copyAssetFullData,
  type AssetFullInstanceR,
} from './AssetFullInstance';
import type { IProjectContext } from './IProjectContext';

export class AssetChangerDefault extends AssetChanger {
  constructor(
    public projectContext: IProjectContext,
    private _assetFull: AssetFullInstanceR | null,
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
      await this.projectContext.get(AssetSubContext).makeAssetMultipleChange(
        {
          id: [original.id],
        },
        request.changes,
      );
    }
    return response;
  }
}
