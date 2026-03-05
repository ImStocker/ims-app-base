import {
  castAssetPropValueToAsset,
  castAssetPropValueToString,
  stringifyAssetNewBlockRef,
  type AssetPropsPlainObject,
  type AssetPropValueAsset,
} from '../types/Props';
import { AppSubManagerBase } from './IAppManager';
import ProjectSettingsManager from './ProjectSettingsManager';

export function getExportFormatFieldRef({
  block_name,
  block_id,
  prop_key,
}: {
  block_name: string | null;
  block_id: string | null;
  prop_key?: string;
}) {
  let stringified_block_ref: string | null = null;
  if (block_name && block_id) {
    stringified_block_ref = stringifyAssetNewBlockRef(block_name, null);
  } else {
    stringified_block_ref = stringifyAssetNewBlockRef(block_name, block_id);
  }
  return stringified_block_ref + '|' + prop_key;
}

export type ExportFormat = {
  title: string;
  assetType: AssetPropValueAsset | null;
  segmentType: string;
  kind: 'full' | 'valuesOnly' | 'selectFields';
  fields: ExportFormatField[];
  params: AssetPropsPlainObject; // JSON - oneFile, CSV - showTitles, delimiter
  jscode?: string | null;
};

export type ExportFormatWithId = {
  id: string;
} & ExportFormat;

export type ExportFormatField = {
  ref: string;
  title: string;
  name: string;
};

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
