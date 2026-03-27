import { defineAsyncComponent } from 'vue';
import type { Workspace } from '../types/Workspaces';
import DialogManager from '../managers/DialogManager';
import UiManager, { ToastTypes } from '../managers/UiManager';
import {
  DEFAULT_PROJECT_EXPORT_SETTINGS,
  type ProjectImportResponseDTO,
} from '../types/ProjectTypes';
import UiPreferenceManager from '../managers/UiPreferenceManager';
import { v4 as uuidv4 } from 'uuid';
import type { AssetPropWhere } from '../types/PropsWhere';
import type { SyncLocalRootSegment } from '../local-fs-sync/SyncLocalRoot';
import LocalFsSyncSubContext from './LocalFsSyncSubContext';
import { openBlobFile } from '../utils/dataUtils';
import type { AssetShort } from '../types/AssetsType';
import {
  ProjectSubContext,
  type IProjectContext,
} from '#logic/types/IProjectContext';
import ApiManager from '#logic/managers/ApiManager';
import { HttpMethods, Service } from '#logic/managers/ApiWorker';
import {
  stringifyAssetNewBlockRef,
  type AssetPropValueAsset,
  type AssetPropsPlainObject,
  castAssetPropValueToString,
  castAssetPropValueToAsset,
} from '#logic/types/Props';
import { AssetSubContext } from './AssetSubContext';
import SettingsSubContext from './SettingsSubContext';

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

export default class ImportExportSubContext extends ProjectSubContext {
  declare projectContext: IProjectContext; // To fix TS errors in app projects

  // To fix TS errors in app projects
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(projectContext: IProjectContext) {
    super(projectContext);
  }

  async exportWorkspace(
    workspace: Workspace,
    params?: Record<string, any>,
  ): Promise<void> {
    const res = await this.projectContext.appManager
      .get(ApiManager)
      .download(Service.CREATORS, HttpMethods.GET, 'project/export', {
        workspace_id: workspace.id,
        ...params,
        pid: this.projectContext.projectInfo.id,
      });

    const file_title = `${workspace.name ? workspace.name : workspace.title}.zip`;
    await openBlobFile(new Blob([res]), file_title);
  }

  async exportAsset(
    asset: AssetShort,
    params?: Record<string, any>,
  ): Promise<void> {
    const res = await this.projectContext.appManager
      .get(ApiManager)
      .download(
        Service.CREATORS,
        HttpMethods.GET,
        `project/export/asset/${asset.id}`,
        {
          use_names: params?.use_names,
          pid: this.projectContext.projectInfo.id,
        },
      );
    const file_title = `${asset.name ? asset.name : asset.title}.ima.json`;
    await openBlobFile(new Blob([res]), file_title);
  }

  async importFile(
    file: Blob,
    name: string,
    workspace_id?: string | null,
  ): Promise<ProjectImportResponseDTO> {
    const project_info = this.projectContext.projectInfo;

    const formData = new FormData();
    formData.append('file', file, name);
    formData.append('pid', project_info.id);

    if (workspace_id === undefined) {
      workspace_id = (
        await this.projectContext
          .get(AssetSubContext)
          .getWorkspaceByNameViaCache('gdd')
      )?.id;
    }
    return await this.projectContext.appManager
      .get(ApiManager)
      .call(Service.CREATORS, HttpMethods.POST, 'project/import', formData, {
        workspace_id: workspace_id,
        pid: this.projectContext.projectInfo.id,
      });
  }

  public getExportFormats(): ExportFormatWithId[] {
    const formats = this.projectContext
      .get(SettingsSubContext)
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
    await this.projectContext
      .get(SettingsSubContext)
      .setValue('export-format', format.id, format);
  }

  public async deleteExportFormat(id: string) {
    await this.projectContext
      .get(SettingsSubContext)
      .setValue('export-format', id, null);
  }

  async importFiles(
    target_workspace_id: string | null,
    files: File[],
  ): Promise<void> {
    if (!target_workspace_id) return;
    if (files.length === 0) return;
    for (const file of files) {
      if (!/(\.ima[ \d()[\]_]*\.json|\.zip)$/.test(file.name)) {
        throw new Error(
          this.projectContext.appManager.$t(
            'importExport.importWrongFileTypes',
          ),
        );
      }
    }

    const is_single_file =
      files.length === 1 && /\.ima[ \d()[\]_]*\.json$/.test(files[0].name);
    if (is_single_file) {
      await this.projectContext.appManager.get(UiManager).showProgressToast(
        async (progress) => {
          const res = await this.importFile(
            files[0],
            files[0].name,
            target_workspace_id,
          );
          if (res.createdAssets < 1) {
            progress({
              type: ToastTypes.ERROR,
              message: res.logs.map((log) => log.text).join(';\n'),
            });
          } else {
            progress({
              type: ToastTypes.SUCCESS,
            });
          }
        },
        {
          message: this.projectContext.appManager.$t(
            'toasts.actionTitles.importAsset',
          ),
          icon: 'ri-download-2-fill',
        },
      );
    } else {
      const ProjectImportDialog = defineAsyncComponent(
        () => import('../../components/Project/ProjectImportDialog.vue'),
      );
      await this.projectContext.appManager
        .get(DialogManager)
        .show(ProjectImportDialog, {
          files,
          workspaceId: target_workspace_id,
        });
    }
  }

  async importAsset(workspace: Workspace) {
    const file_input_element = document.createElement('input');
    file_input_element.type = 'file';
    file_input_element.style.display = 'none';
    file_input_element.accept = '.ima.json, .zip';

    file_input_element.onchange = async (e: any) => {
      let file: File | null = null;
      if (e.target && e.target.files && e.target.files.length > 0) {
        file = e.target.files[0];
        e.target.value = null;
      }

      await this.projectContext.appManager.get(UiManager).doTask(async () => {
        if (file) {
          const ConfirmDialog = defineAsyncComponent(
            () => import('../../components/Common/ConfirmDialog.vue'),
          );
          const answer = await this.projectContext.appManager
            .get(DialogManager)
            .show(ConfirmDialog, {
              header: this.projectContext.appManager.$t(
                'importExport.importAsset',
              ),
              message: this.projectContext.appManager.$t(
                'importExport.importAssetConfirm',
              ),
              yesCaption: this.projectContext.appManager.$t(
                'importExport.importAsset',
              ),
            });
          if (answer) {
            await this.importFiles(workspace.id, [file]);
          }
        }
      });
    };
    file_input_element.click();
  }

  async exportWorkspaceToDocument(workspace: Workspace, type: 'pdf' | 'md') {
    await this.projectContext.appManager.get(UiManager).doTask(async () => {
      const ExportToDocumentDialog = defineAsyncComponent(
        () => import('../../components/Asset/ExportToDocumentDialog.vue'),
      );
      const dialog = this.projectContext.appManager
        .get(DialogManager)
        .create(ExportToDocumentDialog, {
          workspaceId: workspace.id,
          type,
        });
      await dialog.open();
    });
  }
  async exportWorkspaceToJSON(workspace: Workspace) {
    await this.projectContext.appManager.get(UiManager).showProgressToast(
      async (progress) => {
        const export_settings = this.projectContext.appManager
          .get(UiPreferenceManager)
          .getPreference(
            'ProjectExportSettings.settings',
            DEFAULT_PROJECT_EXPORT_SETTINGS,
          );
        await this.exportWorkspace(workspace, export_settings);
        progress({
          type: ToastTypes.SUCCESS,
        });
      },
      {
        message: this.projectContext.appManager.$t(
          'toasts.actionTitles.exportWorkspace',
        ),
        icon: 'ri-upload-2-fill',
      },
    );
  }

  async exportToDocumentAsset(asset: AssetShort, type: 'pdf' | 'md') {
    await this.projectContext.appManager.get(UiManager).doTask(async () => {
      const ExportToDocumentDialog = defineAsyncComponent(
        () => import('../../components/Asset/ExportToDocumentDialog.vue'),
      );
      await this.projectContext.appManager
        .get(DialogManager)
        .show(ExportToDocumentDialog, {
          assetIds: [asset.id],
          type,
        });
    });
  }

  async exportToJSONAsset(asset: AssetShort) {
    await this.projectContext.appManager.get(UiManager).showProgressToast(
      async (progress) => {
        const export_settings = this.projectContext.appManager
          .get(UiPreferenceManager)
          .getPreference(
            'ProjectExportSettings.settings',
            DEFAULT_PROJECT_EXPORT_SETTINGS,
          );
        await this.exportAsset(asset, export_settings);
        progress({
          type: ToastTypes.SUCCESS,
        });
      },
      {
        message: this.projectContext.appManager.$t(
          'toasts.actionTitles.exportAsset',
        ),
        icon: 'ri-upload-2-fill',
      },
    );
  }

  protected async saveWithCustomFormat(file: { content: Blob; name: string }) {
    await openBlobFile(file.content, file.name);
  }

  async exportWithCustomFormat(
    asset_type_filter: AssetPropWhere,
    title: string,
  ) {
    const EditFormatsDialog = defineAsyncComponent(
      () => import('../../components/Export/EditFormatsDialog.vue'),
    );
    const res = await this.projectContext.appManager
      .get(DialogManager)
      .show(EditFormatsDialog, {
        selectable: true,
        // TODO: fix types
        assetSelection: { Where: asset_type_filter, Str: '' },
        actionType: 'export',
      });
    if (!res || !res.formatId) return;
    const configuration: SyncLocalRootSegment = {
      id: uuidv4(),
      // TODO: fix types
      assetSelection: { Where: asset_type_filter, Str: '' },
      index: 0,
      saveAs: title,
      formatId: res.formatId,
    };
    await this.projectContext.appManager.get(UiManager).showProgressToast(
      async (state) => {
        state({
          progress: 0,
        });
        const res = await this.projectContext
          .get(LocalFsSyncSubContext)
          .exportOne(configuration, (p) => {
            state({
              progress: p,
            });
          });
        if (res) {
          await this.saveWithCustomFormat(res);
          state({
            progress: 1,
            type: ToastTypes.SUCCESS,
          });
        }
      },
      {
        message: this.projectContext.appManager.$t(
          'toasts.actionTitles.exportAsset',
        ),
        icon: 'ri-upload-2-fill',
      },
    );
  }

  async exportCollectionWithCustomFormat(workspace: Workspace) {
    const assetTypeFilter: AssetPropWhere = {
      workspaceids: [workspace.id],
    };

    await this.exportWithCustomFormat(
      assetTypeFilter,
      workspace.name ?? workspace.title,
    );
  }

  async exportAssetWithCustomFormat(asset: AssetShort) {
    const asset_type_filter: AssetPropWhere = {
      id: asset.id,
    };

    const name = asset.name ?? asset.title;
    await this.exportWithCustomFormat(asset_type_filter, name ?? asset.id);
  }
}
