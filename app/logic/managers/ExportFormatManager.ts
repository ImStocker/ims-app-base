import type { AssetPropField } from '../../components/Asset/SelectAssetPropFields';
import {
  castAssetPropValueToAsset,
  castAssetPropValueToString,
  type AssetPropsPlainObject,
  type AssetPropValueAsset,
} from '../types/Props';
import { AppSubManagerBase } from './IAppManager';
import ProjectSettingsManager from './ProjectSettingsManager';

export type ExportFormat = {
  title: string;
  assetType: AssetPropValueAsset | null;
  segmentType: string;
  kind: 'full' | 'valuesOnly' | 'selectFields';
  fields: AssetPropField[];
  params: AssetPropsPlainObject; // JSON - oneFile, CSV - showTitles, delimiter
  jscode?: string | null;
};

export type ExportFormatWithId = {
  id: string;
} & ExportFormat;

export default class ExportFormatManager extends AppSubManagerBase {
  init() {}

  public getExportFormats(): ExportFormatWithId[] {
    const formats = this.appManager
      .get(ProjectSettingsManager)
      .getValue<Record<string, any>>('export-format');
    if (!formats) return [];

    const res: ExportFormatWithId[] = [];

    for (const format of Object.values(formats)) {
      if (!format) continue;

      const serialized_format: ExportFormatWithId = {
        id: castAssetPropValueToString(format.id),
        title: castAssetPropValueToString(format.title),
        assetType: castAssetPropValueToAsset(
          format.assetType ?? format.asset_type,
        ),
        fields: format.fields ? format.fields : [],
        kind: format.kind,
        jscode: castAssetPropValueToString(format.jscode),
        params: format.params
          ? {
              showTitles: format.params.showTitles ?? format.params.show_titles,
              delimiter: format.params.delimiter,
              oneFile: format.params.oneFile ?? format.params.one_file,
            }
          : {},
        segmentType: castAssetPropValueToString(
          format.segmentType ?? format.segment_type,
        ),
      };
      res.push(serialized_format);
    }
    return res;
  }

  public async saveExportFormat(format: ExportFormatWithId) {
    await this.appManager
      .get(ProjectSettingsManager)
      .setValue('export-format', format.id, format);
  }

  public async deleteExportFormat(id: string) {
    await this.appManager
      .get(ProjectSettingsManager)
      .setValue('export-format', id, null);
  }
}
