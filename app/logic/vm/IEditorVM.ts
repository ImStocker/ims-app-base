import type { AssetForEdit } from '../types/AssetsType';
import type { AssetBlockEditorVM } from './AssetBlockEditorVM';
import type { IAssetEditorToolbarVM } from './IAssetEditorToolbarVM';

export interface IEditorVM extends IAssetEditorToolbarVM {
  applyAssetChanges(asset: AssetForEdit): AssetForEdit;
  getAssetBlockEditorForAsset(assetId: string): AssetBlockEditorVM | null;
}
