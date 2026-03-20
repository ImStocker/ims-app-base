import {
  AssetChanger,
  type HistorySaveRequest,
  type HistorySaveResponse,
} from './AssetChanger';

export class AssetChangerDummy extends AssetChanger {
  protected override async _saveChangesImpl(
    _requests: HistorySaveRequest[],
  ): Promise<HistorySaveResponse> {
    return {
      originals: [],
    };
  }
}
