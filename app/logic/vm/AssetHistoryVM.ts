import ConfirmDialog from '#components/Common/ConfirmDialog.vue';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';
import DialogManager from '#logic/managers/DialogManager';
import UiManager from '#logic/managers/UiManager';
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { AssetHistoryDTO } from '#logic/types/AssetHistory';
import type { ApiResultListWithMore } from '#logic/types/ProjectTypes';
import {
  convertTranslatedTitle,
  type AssetHistoryMode,
} from '#logic/utils/assets';
import { unref } from 'vue';
import type { IAppManager } from '../managers/IAppManager';
import { AssetChangerDefault } from '../types/AssetChangerDefault';
import {
  copyAssetFullData,
  type AssetFullInstanceR,
} from '../types/AssetFullInstance';
import type { SubscriberHandler } from '../types/Subscriber';
import PromptDialog from '#components/Common/PromptDialog.vue';
import type { AssetsFullResult } from '#logic/types/AssetsType';

export class AssetHistoryVM {
  appManager: IAppManager;
  loadEpoch: number = 0;
  loadDone: boolean;
  loadError: string | null;
  mode: AssetHistoryMode = 'usual';
  history: ApiResultListWithMore<AssetHistoryDTO>;
  private _selectedVersionId: string | null;
  assetChanger: AssetChanger;
  private _subscribe: SubscriberHandler | null = null;

  constructor(
    appManager: IAppManager,
    private _assetFull: AssetFullInstanceR,
    private _customProjectId: string | null = null,
  ) {
    this.appManager = appManager;
    this.loadDone = false;
    this.loadError = null;
    this.history = {
      list: [],
      more: true,
    };
    this.assetChanger = new AssetChangerDefault(
      appManager,
      this._assetFull,
      this._customProjectId,
    );
    this._selectedVersionId = null;
  }

  get openedAssetId() {
    return this._assetFull.id;
  }

  get selectedVersionId() {
    return this._selectedVersionId;
  }

  async init() {
    this._subscribe = this.appManager
      .get(CreatorAssetManager)
      .projectContentEvents.subscribe(async (change_res) => {
        if (change_res.aUpsIds.includes(this.openedAssetId)) {
          await this.load();
        }
      });
  }

  destroy() {
    if (this._subscribe) {
      this._subscribe.unsubscribe();
      this._subscribe = null;
    }
  }

  async load() {
    this.loadDone = false;
    const load_epoch = ++this.loadEpoch;
    try {
      this.history = await this.appManager
        .get(CreatorAssetManager)
        .getHistory(this.openedAssetId);
      if (load_epoch === this.loadEpoch) {
        this._loadAssetChangerForSelectedVersion();
      }
    } catch (err: any) {
      if (load_epoch === this.loadEpoch) {
        this.loadError = err.message;
      }
    } finally {
      if (load_epoch === this.loadEpoch) {
        this.loadDone = true;
      }
    }
  }

  setSelectedVersionId(version_id: string | null) {
    this._selectedVersionId = version_id;
    this._loadAssetChangerForSelectedVersion();
  }

  async restoreVersion(version_id: string | null) {
    this._loadAssetChanger(version_id);
    await this.assetChanger.saveChanges();
  }

  async saveAsCopy(
    version_id: string | null,
  ): Promise<AssetsFullResult | undefined> {
    const asset_changer = this._loadAssetChanger(version_id);
    if (!asset_changer) return;
    const changed_asset_version = asset_changer.applyChanges(this._assetFull);
    const changed_asset = unref(changed_asset_version);
    if (!changed_asset) return;
    const full = copyAssetFullData(changed_asset);
    const new_title = await this.appManager
      .get(DialogManager)
      .show(PromptDialog, {
        header: this.appManager.$t('gddPage.saveAsCopy', {
          element: convertTranslatedTitle(full.title ?? '', this.appManager.$t),
        }),
        message: this.appManager.$t('gddPage.elements.inputElementName'),
        yesCaption: this.appManager.$t('gddPage.saveAsCopy'),
        value: full.title ?? '',
      });
    if (!new_title) return;
    return await this.appManager
      .get(CreatorAssetManager)
      .copyAsset(full, new_title);
  }

  private _loadAssetChangerForSelectedVersion() {
    const asset_changer = this._loadAssetChanger(this._selectedVersionId);
    if (asset_changer) {
      this.assetChanger = asset_changer;
    }
  }

  private _loadAssetChanger(version_id: string | null): AssetChanger | null {
    if (!this.openedAssetId) return null;
    const new_asset_changer = new AssetChangerDefault(
      this.appManager,
      this._assetFull,
      this._customProjectId,
    );
    if (version_id) {
      for (const item of this.history.list) {
        if (item.id === version_id) {
          break;
        }
        new_asset_changer.registerChange(this.openedAssetId, item.undo);
      }
    }
    return new_asset_changer;
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
