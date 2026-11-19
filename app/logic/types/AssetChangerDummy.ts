import {
  AssetChanger,
  type HistorySaveRequest,
  type HistorySaveResponse,
} from './AssetChanger';
import type { AssetChangeBatchOpDTO } from './AssetsType';

export class AssetChangerDummy extends AssetChanger {
  protected override async _saveChangesImpl(
    _requests: HistorySaveRequest[],
    _extraOps?: AssetChangeBatchOpDTO[],
  ): Promise<HistorySaveResponse> {
    return {
      originals: [],
    };
  }
}
