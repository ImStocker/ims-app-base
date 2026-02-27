import type {
  ProjectSettings,
  ProjectSettingsValue,
} from '../types/ProjectTypes';
import {
  assignPlainValueToAssetProps,
  convertAssetPropsToPlainObject,
  type AssetProps,
  type AssetPropsPlainObject,
} from '../types/Props';
import CreatorAssetManager from './CreatorAssetManager';
import { AppSubManagerBase } from './IAppManager';
import ProjectManager from './ProjectManager';

export default class ProjectSettingsManager extends AppSubManagerBase {
  protected _projectSettings: ProjectSettings | null = null;

  async init() {}

  async setCurrentProjectSettings(project_settings: ProjectSettings | null) {
    if (!project_settings) return;
    this._projectSettings = project_settings;
  }

  getValue<T extends AssetPropsPlainObject>(
    field: string,
    _key?: string,
  ): T | null {
    if (!this._projectSettings) return null;
    return convertAssetPropsToPlainObject<T>(
      this._projectSettings.values[field],
    );
  }
  async setValue(
    field: keyof ProjectSettingsValue,
    key: string,
    value: AssetPropsPlainObject | null,
  ): Promise<void> {
    if (!this._projectSettings) {
      throw new Error('Settings are not available');
    }

    const prepared_value: AssetProps = {};

    if (value) {
      for (const [k, v] of Object.entries(value)) {
        assignPlainValueToAssetProps(prepared_value, v, `${key}\\${k}`);
      }
    }

    await this.appManager.get(CreatorAssetManager).changeAssets({
      where: {
        id: this._projectSettings.id,
      },
      set: {
        blocks: {
          [field]: {
            props: {
              [`~${key}`]: null,
              ...prepared_value,
            },
          },
        },
      },
    });
    await this.reloadProjectSettings();
  }

  async reloadProjectSettings() {
    const project_info = await this.appManager
      .get(ProjectManager)
      .getProjectInfoWithParams();
    this._projectSettings = project_info.settings;
  }
}
