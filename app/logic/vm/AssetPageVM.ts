import type { LangStr } from '../types/ProjectTypes';
import { PageVMBase } from '../types/PageVMBase';
import { AssetFullEditorVM } from './AssetFullEditorVM';
import type { IProjectContext } from '#logic/types/IProjectContext';

export type AssetPageVMParams = {
  assetId: string;
  lang: LangStr;
};

export class AssetPageVM extends PageVMBase<AssetPageVMParams> {
  assetId: string;
  private _assetFullEditorVM: AssetFullEditorVM;

  constructor(
    public projectContext: IProjectContext,
    params: AssetPageVMParams,
  ) {
    super(projectContext.appManager, params);
    this.assetId = params.assetId;
    this._assetFullEditorVM = new AssetFullEditorVM(
      projectContext,
      this.assetId,
    );
  }

  get assetFullEditorVM(): AssetFullEditorVM {
    return this._assetFullEditorVM;
  }

  get asset() {
    if (!this._assetFullEditorVM) return null;
    if (!this.assetId) return null;
    return this._assetFullEditorVM.getAssetFull(this.assetId) ?? null;
  }

  async changeAssetId(new_asset_id: string) {
    this.assetId = new_asset_id;
    await this.load();
  }

  async load() {
    await this._assetFullEditorVM.load();
  }

  toJSON(): Record<string, any> {
    return {
      params: this.params,
      assetFullEditor: this._assetFullEditorVM
        ? this._assetFullEditorVM.toJSON()
        : this._assetFullEditorVM,
    };
  }
  loadJSON(data: Record<string, any>): void {
    this._params = data.params;
    if (data.assetFullEditor) {
      this._assetFullEditorVM = new AssetFullEditorVM(
        this.projectContext,
        data.assetId,
      );
      this._assetFullEditorVM.loadJSON(data.assetFullEditor);
    }
  }

  destroy() {}
}
