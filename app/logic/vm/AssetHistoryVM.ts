import ConfirmDialog from '#components/Common/ConfirmDialog.vue';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';
import DialogManager from '#logic/managers/DialogManager';
import UiManager from '#logic/managers/UiManager';
import { AssetChanger } from '#logic/types/AssetChanger';
import type { AssetHistoryDTO } from '#logic/types/AssetHistory';
import type { ApiResultListWithMore } from '#logic/types/ProjectTypes';
import type { AssetHistoryMode } from '#logic/utils/assets';
import type { IAppManager } from '../managers/IAppManager';

export class AssetHistoryVM {
  appManager: IAppManager;
  loadDone: boolean;
  loadError: string | null;
  openedAssetId: string | null;
  mode: AssetHistoryMode = 'usual';
  history: ApiResultListWithMore<AssetHistoryDTO>;
  private _selectedVersionId: string | null;
  assetChanger: AssetChanger;

  constructor(appManager: IAppManager, asset_id: string | null) {
    this.appManager = appManager;
    this.loadDone = false;
    this.loadError = null;
    this.openedAssetId = asset_id;
    this.history = {
      list: [],
      more: true,
    };
    this.assetChanger = new AssetChanger(async () => {
      return { originals: [] };
    });
    this._selectedVersionId = null;
  }

  get selectedVersionId() {
    return this._selectedVersionId;
  }

  async load() {
    this.loadDone = false;
    try {
      if (this.openedAssetId) {
        this.history = await this.appManager
          .get(CreatorAssetManager)
          .getHistory(this.openedAssetId);
        this._loadAssetChangerOfSelectedVersion();
      }
    } catch (err: any) {
      this.loadError = err.message;
    } finally {
      this.loadDone = true;
    }
  }

  setSelectedVersionId(version_id: string | null) {
    this._selectedVersionId = version_id;
    this._loadAssetChangerOfSelectedVersion();
  }

  private _loadAssetChangerOfSelectedVersion() {
    if (!this.openedAssetId) return;
    const new_asset_changer = new AssetChanger(async () => {
      return { originals: [] };
    });
    if (this._selectedVersionId) {
      for (const item of this.history.list) {
        if (item.id === this._selectedVersionId) {
          break;
        }
        new_asset_changer.registerChange(this.openedAssetId, item.undo);
      }
    }
    this.assetChanger = new_asset_changer;
  }

  async rollbackChange(change_id: string) {
    const historyRecord = this.history.list.find((r) => r.id === change_id);
    if (!historyRecord) return;
    const confirm = await this.appManager
      .get(DialogManager)
      .show(ConfirmDialog, {
        header: this.appManager.$t('common.dialogs.confirm'),
        message: this.appManager.$t('assetHistory.rollbackChangeConfirm'),
      });
    if (!confirm) return;
    await this.appManager.get(UiManager).doTask(async () => {
      await this.appManager.get(CreatorAssetManager).changeAssets({
        where: {
          id: this.openedAssetId,
        },
        set: historyRecord.undo,
      });
      await this.load();
    });
  }
  async revertToState(change_id: string) {
    const historyRecordIndex = this.history.list.findIndex(
      (r) => r.id === change_id,
    );
    if (historyRecordIndex < 0) return;
    const confirm = await this.appManager
      .get(DialogManager)
      .show(ConfirmDialog, {
        header: this.appManager.$t('common.dialogs.confirm'),
        message: this.appManager.$t('assetHistory.revertToStateConfirm'),
      });
    if (!confirm) return;
    await this.appManager.get(UiManager).doTask(async () => {
      throw new Error('NOT IMPLEMENTED');
    });
  }
}
