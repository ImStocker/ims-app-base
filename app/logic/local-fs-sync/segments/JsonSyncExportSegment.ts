import ExportFormatManager, {
  type ExportFormat,
} from '../../managers/ExportFormatManager';
import LocalFsSyncManager from '../../managers/LocalFsSyncManager';
import {
  castAssetPropValueToString,
  type AssetPropValue,
} from '../../types/Props';
import { getPreparedAssets } from '../getPreparedAsset';
import type { ISyncTarget } from '../ISyncTarget';
import type { SyncChunk } from '../SyncChunk';
import type { SyncContext } from '../SyncContext';
import { SyncExportSegment } from '../SyncExportSegment';

export type JsonSyncExportSegmentFormatOptionsType =
  | 'full'
  | 'valuesOnly'
  | 'selectFields';

export const JsonSyncExportSegmentFormatOptions: JsonSyncExportSegmentFormatOptionsType[] =
  ['full', 'valuesOnly', 'selectFields'];

export default class JsonSyncExportSegment extends SyncExportSegment {
  static override Name = 'json';

  override getVersion() {
    return '2505291317';
  }

  override async init(
    context: SyncContext,
    target: ISyncTarget,
  ): Promise<ISyncTarget> {
    if (this._oneFile) {
      return target;
    }
    return super.init(context, target);
  }

  override async destroy(
    context: SyncContext,
    target: ISyncTarget,
  ): Promise<void> {
    if (this._oneFile) {
      await target.deleteFile(`${this.info.saveAs}.json`);
    } else {
      return super.destroy(context, target);
    }
  }

  override forceFullSync(): boolean {
    return this._oneFile;
  }

  private _preparedData: Record<string, any>[] = [];

  override async sync(
    context: SyncContext,
    target: ISyncTarget,
    chunk: SyncChunk,
  ): Promise<void> {
    if (chunk.assetUpdatedIds.length > 0) {
      let prepared_assets: Record<string, any>[] = [];

      const fields = Array.isArray(this._currentFormat?.fields)
        ? (this._currentFormat.fields as any)
        : undefined;

      prepared_assets = await getPreparedAssets(
        this.appManager,
        {
          where: {
            id: chunk.assetUpdatedIds,
          },
        },
        {
          kind: this._currentExportKind,
          fields,
        },
      );

      const jscode = castAssetPropValueToString(
        (this._currentFormat?.jscode ?? '') as AssetPropValue,
      );

      if (jscode) {
        prepared_assets = await this.appManager
          .get(LocalFsSyncManager)
          .getUserCodeExecutorManager()
          .formatAssetsByCode(prepared_assets, jscode);
      }

      if (!this._oneFile) {
        await Promise.all(
          prepared_assets.map(async (asset, asset_index) => {
            const prep = prepared_assets[asset_index] ?? {};
            const name = `${asset.id}.json`;
            await target.putFile(
              name,
              new Blob([JSON.stringify(prep, null, 1)]),
            );
          }),
        );
      } else {
        this._preparedData = [...this._preparedData, ...prepared_assets];
      }
    }
    if (chunk.assetDeletedIds.length > 0) {
      if (!this._oneFile) {
        await Promise.all(
          chunk.assetDeletedIds.map((id) =>
            target.deleteFile(this._mapAssetIdToFileName(id)),
          ),
        );
      }
    }
  }

  override async finalizeSync(
    _context: SyncContext,
    target: ISyncTarget,
  ): Promise<void> {
    if (this._oneFile) {
      const name = this.info.saveAs;
      await target.putFile(
        `${name}.json`,
        new Blob([JSON.stringify(this._preparedData, null, 1)]),
      );
    }
  }

  private get _currentFormat(): ExportFormat | undefined {
    const format = this.appManager
      .get(ExportFormatManager)
      .getExportFormats()
      .find((el) => el.id === this.info.formatId);
    return format;
  }

  private get _currentExportKind(): JsonSyncExportSegmentFormatOptionsType {
    let format: JsonSyncExportSegmentFormatOptionsType =
      this._currentFormat?.kind ?? 'full';
    if (
      this._currentFormat?.kind === 'valuesOnly' ||
      this._currentFormat?.kind === 'selectFields'
    ) {
      format = this._currentFormat.kind;
    }
    return format;
  }

  private _mapAssetIdToFileName(id: string) {
    return `${id}.json`;
  }

  private get _oneFile(): boolean {
    return !!this._currentFormat?.params['oneFile'];
  }
}
