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
import ProjectManager from '../managers/ProjectManager';
import {
  ProjectSubContext,
  type IProjectContext,
} from '#logic/types/IProjectContext';
import { AssetSubContext } from './AssetSubContext';
import { assert } from '#logic/utils/typeUtils';

export default class SettingsSubContext extends ProjectSubContext {
  declare projectContext: IProjectContext; // To fix TS errors in app projects

  // To fix TS errors in app projects
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(projectContext: IProjectContext) {
    super(projectContext);
  }

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

    await this.projectContext.get(AssetSubContext).changeAssets({
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
    const project_info = await this.projectContext.appManager
      .get(ProjectManager)
      .loadProjectFullInfo(this.projectContext.projectInfo.id);
    assert(project_info, 'project info not found');
    this._projectSettings = project_info.settings;
  }
}
