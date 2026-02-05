import type { IAppManager } from '../managers/IAppManager';
import CreatorAssetManager from '../managers/CreatorAssetManager';
import type { AssetsFullResult, AssetShort } from '../types/AssetsType';
import AssetSettingsDialog from '../../components/Asset/AssetSettingsDialog.vue';
import DialogManager from '../managers/DialogManager';
import UiManager from '../managers/UiManager';
import type { AssetFullInstanceR } from '../types/AssetFullInstance';
import AssetRefsDialog from '../../components/Asset/References/AssetRefsDialog.vue';
import AssetPreviewDialog from '../../components/Asset/AssetPreviewDialog.vue';
import ProjectManager from '../managers/ProjectManager';
import { assert } from '../utils/typeUtils';

export class AssetFullEditorVM {
  appManager: IAppManager;
  assetFulls: {
    [key: string]: AssetFullInstanceR;
  };
  loadDone: boolean;
  loadError: string | null;
  openedAssetId: string | null;

  constructor(appManager: IAppManager, asset_id: string | null) {
    this.appManager = appManager;
    this.assetFulls = {};
    this.loadDone = false;
    this.loadError = null;
    this.openedAssetId = asset_id;
  }

  get projectInfo() {
    const res = this.appManager.get(ProjectManager).getProjectInfo();
    assert(res);
    return res;
  }
  getOpenedAssetFull(): AssetFullInstanceR | null {
    if (
      this.openedAssetId &&
      this.assetFulls.hasOwnProperty(this.openedAssetId)
    ) {
      return this.assetFulls[this.openedAssetId];
    } else {
      return null;
    }
  }

  getAssetFull(asset_id: string): AssetFullInstanceR | null {
    const res = this.assetFulls.hasOwnProperty(asset_id)
      ? this.assetFulls[asset_id]
      : null;
    if (res) return res;
    return (
      this.appManager
        .get(CreatorAssetManager)
        .getAssetInstanceViaCacheSync(asset_id) ?? null
    );
  }

  getAllAreAbstract(): boolean {
    const opened = this.getOpenedAssetFull();
    return opened ? opened.isAbstract : false;
  }

  getCommonParent(): AssetShort | null {
    const opened = this.getOpenedAssetFull();
    if (!opened) return null;
    if (opened.parentIds.length === 0) return null;
    return (
      this.appManager
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(opened.parentIds[0]) ?? null
    );
  }

  getIsReadonly(): boolean {
    const opened = this.getOpenedAssetFull();
    return opened ? opened.rights < 2 : true;
  }

  async load() {
    try {
      this.loadError = null;
      this.loadDone = false;
      if (this.openedAssetId) {
        const assets_result = await this.appManager
          .get(CreatorAssetManager)
          .getAssetInstancesList({
            where: {
              id: [this.openedAssetId],
            },
          });
        this.assetFulls = {};
        for (const instance of assets_result.list) {
          this.assetFulls[instance.id] = instance;
        }
      }
      this.loadDone = true;
    } catch (err: any) {
      this.loadError = err.message.toString();
    }
  }

  async changeAsset(assetIds: string[]) {
    this.appManager.get(UiManager).doTask(async () => {
      const res: AssetsFullResult | undefined = await this.appManager
        .get(DialogManager)
        .show(AssetSettingsDialog, {
          assetIds,
        });
      if (res) {
        await this.load();
      }
    });
  }

  async openAssetPreviewDialog(assetId: string) {
    this.appManager.get(UiManager).doTask(async () => {
      const _res = await this.appManager
        .get(DialogManager)
        .show(AssetPreviewDialog, {
          assetId,
        });
      //if (res){
      //    await this.load();
      //}
    });
  }

  async changeAssetLinks(assetIds: string[]) {
    this.appManager.get(UiManager).doTask(async () => {
      const AssetLinksDialog = (
        await import('../../components/Asset/AssetLinksDialog.vue')
      ).default;
      await this.appManager.get(DialogManager).show(AssetLinksDialog, {
        assetIds,
      });
    });
  }

  async openCreateRefDialog(reverse = false): Promise<void> {
    if (!this.openedAssetId) return;
    const asset_id = this.openedAssetId;
    this.appManager.get(UiManager).doTask(async () => {
      await this.appManager.get(DialogManager).show(AssetRefsDialog, {
        assetIds: [asset_id],
        reverse,
      });
    });
  }

  toJSON(): Record<string, any> {
    const asset_full_preserved = this.appManager
      .get(CreatorAssetManager)
      .serializeAssetFullInstances(Object.values(this.assetFulls));

    return {
      loadDone: this.loadDone,
      loadError: this.loadError,
      assetFulls: asset_full_preserved,
      openedAssetId: this.openedAssetId,
    };
  }
  loadJSON(data: Record<string, any>): void {
    this.loadDone = data.loadDone;
    this.loadError = data.loadError;
    this.appManager
      .get(CreatorAssetManager)
      .updateFullInstanceCache(data.assetFulls);

    this.assetFulls = {};
    for (const asset_id of data.assetFulls.ids) {
      const asset_instance = this.appManager
        .get(CreatorAssetManager)
        .getAssetInstanceViaCacheSync(asset_id);
      assert(asset_instance);
      this.assetFulls[asset_id] = asset_instance;
    }
    this.openedAssetId = data.openedAssetId;
  }
}
