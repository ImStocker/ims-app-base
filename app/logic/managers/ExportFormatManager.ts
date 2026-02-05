import type { ProjectFullInfo } from '../types/ProjectTypes';
import {
  assignPlainValueToAssetProps,
  castAssetPropValueToAsset,
  castAssetPropValueToString,
  convertAssetPropsToPlainObject,
  stringifyAssetNewBlockRef,
  type AssetProps,
  type AssetPropsPlainObject,
  type AssetPropValueAsset,
} from '../types/Props';
import CreatorAssetManager from './CreatorAssetManager';
import { AppSubManagerBase } from './IAppManager';
import ProjectManager from './ProjectManager';

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
  private get _currentProject(): ProjectFullInfo | null {
    return this.appManager.get(ProjectManager).getProjectInfo();
  }

  init() {}

  public getExportFormats(): ExportFormatWithId[] {
    if (!this._currentProject) return [];
    const settings = this._currentProject.settings;
    if (!settings) return [];

    const format_maps = convertAssetPropsToPlainObject<Record<string, any>>(
      settings.values['export-format'],
    );

    const res: ExportFormatWithId[] = [];

    for (const format of Object.values(format_maps)) {
      const serialized_format: ExportFormatWithId = {
        id: castAssetPropValueToString(format.id),
        title: castAssetPropValueToString(format.title),
        assetType: castAssetPropValueToAsset(format.asset_type),
        fields: format.fields ? format.fields : [],
        kind: format.kind,
        jscode: castAssetPropValueToString(format.jscode),
        params: format.params
          ? {
              showTitles: format.params.show_titles,
              delimiter: format.params.delimiter,
              oneFile: format.params.one_file,
            }
          : {},
        segmentType: castAssetPropValueToString(format.segment_type),
      };
      res.push(serialized_format);
    }
    return res;
  }

  public async saveExportFormat(format: ExportFormatWithId) {
    if (!this._currentProject) throw new Error('Project is not selected');
    const settings = this._currentProject.settings;
    if (!settings) throw new Error('Settings are not available');

    const prepared_format: AssetProps = {};
    prepared_format[`${format.id}\\id`] = format.id;
    prepared_format[`${format.id}\\title`] = format.title;
    prepared_format[`${format.id}\\asset_type`] = format.assetType;
    prepared_format[`${format.id}\\segment_type`] = format.segmentType;
    prepared_format[`${format.id}\\kind`] = format.kind;
    prepared_format[`${format.id}\\jscode`] = format.jscode
      ? format.jscode
      : null;
    assignPlainValueToAssetProps(
      prepared_format,
      format.fields,
      `${format.id}\\fields`,
    );
    assignPlainValueToAssetProps(
      prepared_format,
      {
        one_file: format.params.oneFile,
        delimiter: format.params.delimiter,
        show_titles: format.params.showTitles,
      },
      `${format.id}\\params`,
    );

    await this.appManager.get(CreatorAssetManager).changeAssets({
      where: {
        id: settings.id,
      },
      set: {
        blocks: {
          'export-format': {
            props: {
              [`~${format.id}`]: null,
              ...prepared_format,
            },
          },
        },
      },
    });
    await this.appManager.get(ProjectManager).reloadProjectSettings();
  }

  public async deleteExportFormat(id: string) {
    if (!this._currentProject) throw new Error('Project is not selected');
    const settings = this._currentProject.settings;
    if (!settings) throw new Error('Settings are not available');

    await this.appManager.get(CreatorAssetManager).changeAssets({
      where: {
        id: settings.id,
      },
      set: {
        blocks: {
          'export-format': {
            props: {
              [`~${id}`]: null,
            },
          },
        },
      },
    });
    await this.appManager.get(ProjectManager).reloadProjectSettings();
  }
}
