import type { AssetsFullResult, AssetShort } from '../types/AssetsType';
import AssetSettingsDialog from '../../components/Asset/AssetSettingsDialog.vue';
import UiManager from '../managers/UiManager';
import type { AssetFullInstanceR } from '../types/AssetFullInstance';
import AssetRefsDialog from '../../components/Asset/References/AssetRefsDialog.vue';
import AssetPreviewDialog from '../../components/Asset/AssetPreviewDialog.vue';
import { assert } from '../utils/typeUtils';
import type { AssetHistoryMode } from '#logic/utils/assets';
import { AssetHistoryVM } from './AssetHistoryVM';
import type { IProjectContext } from '#logic/types/IProjectContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import { serializeAssetFullInstances } from '#logic/project-sub-contexts/Asset/serializeAssetFullInstances';
import { DialogSubContext } from '#logic/project-sub-contexts/DialogSubContext';

export class AssetFullEditorVM {
  projectContext: IProjectContext;
  assetFulls: {
    [key: string]: AssetFullInstanceR;
  };
  loadDone: boolean;
  loadError: string | null;
  openedAssetId: string | null;
  historyModeVM: AssetHistoryVM | null = null;

  constructor(projectContext: IProjectContext, asset_id: string | null) {
    this.projectContext = projectContext;
    this.assetFulls = {};
    this.loadDone = false;
    this.loadError = null;
    this.openedAssetId = asset_id;
  }

  get projectInfo() {
    return this.projectContext.projectInfo;
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
      this.projectContext
        .get(AssetSubContext)
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
      this.projectContext
        .get(AssetSubContext)
        .getAssetShortViaCacheSync(opened.parentIds[0]) ?? null
    );
  }

  getIsReadonly(): boolean {
    const opened = this.getOpenedAssetFull();
    return opened ? opened.rights < 2 : true;
  }

  async init() {}

  destroy() {
    if (this.historyModeVM) {
      this.historyModeVM.destroy();
      this.historyModeVM = null;
    }
  }

  async load() {
    try {
      this.loadError = null;
      this.loadDone = false;
      if (this.openedAssetId) {
        const assets_result = await this.projectContext
          .get(AssetSubContext)
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

  get mode(): AssetHistoryMode {
    if (this.historyModeVM) {
      return 'history';
    } else {
      return 'usual';
    }
  }

  async changeMode(mode: AssetHistoryMode) {
    const full_asset = this.openedAssetId
      ? this.getAssetFull(this.openedAssetId)
      : null;
    if (mode === 'history') {
      if (full_asset) {
        this.historyModeVM = new AssetHistoryVM(
          this.projectContext,
          full_asset,
        );
        await this.historyModeVM.init();
        await this.historyModeVM.load();
      }
    } else {
      if (this.historyModeVM) {
        this.historyModeVM.destroy();
        this.historyModeVM = null;
      }
    }
  }

  async changeAsset(assetIds: string[]) {
    await this.projectContext.appManager.get(UiManager).doTask(async () => {
      const res: AssetsFullResult | undefined = await this.projectContext
        .get(DialogSubContext)
        .show(AssetSettingsDialog, {
          assetIds,
        });
      if (res) {
        await this.load();
      }
    });
  }

  async openAssetPreviewDialog(assetId: string) {
    this.projectContext.appManager.get(UiManager).doTask(async () => {
      const _res = await this.projectContext
        .get(DialogSubContext)
        .show(AssetPreviewDialog, {
          assetId,
        });
      //if (res){
      //    await this.load();
      //}
    });
  }

  async changeAssetLinks(assetIds: string[]) {
    await this.projectContext.appManager.get(UiManager).doTask(async () => {
      const AssetLinksDialog = (
        await import('../../components/Asset/AssetLinksDialog.vue')
      ).default;
      await this.projectContext.get(DialogSubContext).show(AssetLinksDialog, {
        assetIds,
      });
    });
  }

  async openCreateRefDialog(reverse = false): Promise<void> {
    if (!this.openedAssetId) return;
    const asset_id = this.openedAssetId;
    await this.projectContext.appManager.get(UiManager).doTask(async () => {
      await this.projectContext.get(DialogSubContext).show(AssetRefsDialog, {
        assetIds: [asset_id],
        reverse,
      });
    });
  }

  toJSON(): Record<string, any> {
    const asset_full_preserved = serializeAssetFullInstances(
      this.projectContext,
      Object.values(this.assetFulls),
    );

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
    this.projectContext
      .get(AssetSubContext)
      .updateFullInstanceCache(data.assetFulls);

    this.assetFulls = {};
    for (const asset_id of data.assetFulls.ids) {
      const asset_instance = this.projectContext
        .get(AssetSubContext)
        .getAssetInstanceViaCacheSync(asset_id);
      assert(asset_instance);
      this.assetFulls[asset_id] = asset_instance;
    }
    this.openedAssetId = data.openedAssetId;
  }
}
