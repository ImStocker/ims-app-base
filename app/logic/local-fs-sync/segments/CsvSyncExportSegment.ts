import type { ExportFormat } from '../../managers/ExportFormatManager';
import ExportFormatManager from '../../managers/ExportFormatManager';
import LocalFsSyncManager from '../../managers/LocalFsSyncManager';
import {
  castAssetPropPlainObjectValueToString,
  castAssetPropValueToString,
  type AssetPropValue,
} from '../../types/Props';
import { getPreparedAssets } from '../getPreparedAsset';
import type { ISyncTarget } from '../ISyncTarget';
import type { SyncChunk } from '../SyncChunk';
import type { SyncContext } from '../SyncContext';
import { SyncExportSegment } from '../SyncExportSegment';
import * as Papa from 'papaparse';

export default class CsvSyncExportSegment extends SyncExportSegment {
  static override Name = 'csv';

  override getVersion(): string {
    return '2505191422';
  }

  override async init(
    _context: SyncContext,
    target: ISyncTarget,
  ): Promise<ISyncTarget> {
    return target;
  }

  override async destroy(
    context: SyncContext,
    target: ISyncTarget,
  ): Promise<void> {
    await target.deleteFile(`${this.info.saveAs}.csv`);
  }

  override forceFullSync(): boolean {
    return true;
  }

  private get _currentFormat(): ExportFormat | undefined {
    const format = this.appManager
      .get(ExportFormatManager)
      .getExportFormats()
      .find((el) => el.id === this.info.formatId);
    return format;
  }

  private _preparedData: Record<string, any>[] = [];

  override async sync(
    context: SyncContext,
    target: ISyncTarget,
    chunk: SyncChunk,
  ): Promise<void> {
    if (chunk.assetUpdatedIds.length > 0) {
      let prepared_assets: Record<string, any>[] = [];
      const fields = this._currentFormat?.fields;
      const showTitles = this._currentFormat?.params['showTitles'] ?? true;

      if (!fields || !Array.isArray(fields)) return;

      prepared_assets = await getPreparedAssets(
        this.appManager,
        {
          where: {
            id: chunk.assetUpdatedIds,
          },
        },
        {
          kind: 'selectFields',
          fields: fields as any,
        },
      );

      const jscode = castAssetPropValueToString(
        (this._currentFormat.jscode ?? '') as AssetPropValue,
      );

      if (jscode) {
        prepared_assets = await this.appManager
          .get(LocalFsSyncManager)
          .getUserCodeExecutorManager()
          .formatAssetsByCode(prepared_assets, jscode);
      }

      prepared_assets = prepared_assets.map((asset) => {
        const prepared_asset: Record<string, any> = {};
        for (const key of Object.keys(asset)) {
          prepared_asset[key] = castAssetPropPlainObjectValueToString(
            asset[key],
          );
        }
        return prepared_asset;
      });

      if (!showTitles) {
        prepared_assets = prepared_assets.map((asset) => Object.values(asset));
      }

      this._preparedData = [...this._preparedData, ...prepared_assets];
    }
  }

  override async finalizeSync(
    _context: SyncContext,
    target: ISyncTarget,
  ): Promise<void> {
    const name = this.info.saveAs;
    let delimiter = this._currentFormat?.params['delimiter'] ?? ',';
    if (typeof delimiter !== 'string') {
      delimiter = ',';
    }

    const csv = Papa.unparse(this._preparedData, { delimiter });
    await target.putFile(
      `${name}.csv`,
      new Blob([csv], { type: 'text/plain' }),
    );
  }
}
