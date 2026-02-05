import { defineAsyncComponent } from 'vue';
import type { Workspace } from '../types/Workspaces';
import CreatorAssetManager from './CreatorAssetManager';
import DialogManager from './DialogManager';
import { AppSubManagerBase } from './IAppManager';
import ProjectManager from './ProjectManager';
import UiManager, { ToastTypes } from './UiManager';
import { DEFAULT_PROJECT_EXPORT_SETTINGS } from '../types/ProjectTypes';
import UiPreferenceManager from './UiPreferenceManager';
import { v4 as uuidv4 } from 'uuid';
import type { AssetPropWhere } from '../types/PropsWhere';
import type { SyncLocalRootSegment } from '../local-fs-sync/SyncLocalRoot';
import LocalFsSyncManager from './LocalFsSyncManager';
import { openBlobFile } from '../utils/dataUtils';
import type { AssetShort } from '../types/AssetsType';

export default class ProjectContentManager extends AppSubManagerBase {
  async importFiles(
    target_workspace_id: string | null,
    files: File[],
  ): Promise<void> {
    if (!target_workspace_id) return;
    if (files.length === 0) return;
    for (const file of files) {
      if (!/(\.ima[ \d()[\]_]*\.json|\.zip)$/.test(file.name)) {
        throw new Error(
          this.appManager.$t('importExport.importWrongFileTypes'),
        );
      }
    }

    const is_single_file =
      files.length === 1 && /\.ima[ \d()[\]_]*\.json$/.test(files[0].name);
    if (is_single_file) {
      await this.appManager.get(UiManager).showProgressToast(
        async (progress) => {
          const res = await this.appManager
            .get(ProjectManager)
            .importFile(files[0], files[0].name, target_workspace_id);
          if (res.createdAssets < 1) {
            progress({
              type: ToastTypes.ERROR,
              message: res.logs.map((log) => log.text).join(';\n'),
            });
          } else {
            this.appManager
              .get(CreatorAssetManager)
              .reloadSubscriber.notify({ workspaceId: target_workspace_id });
            progress({
              type: ToastTypes.SUCCESS,
            });
          }
        },
        {
          message: this.appManager.$t('toasts.actionTitles.importAsset'),
          icon: 'ri-download-2-fill',
        },
      );
    } else {
      const ProjectImportDialog = defineAsyncComponent(
        () => import('../../components/Project/ProjectImportDialog.vue'),
      );
      await this.appManager.get(DialogManager).show(ProjectImportDialog, {
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

      await this.appManager.get(UiManager).doTask(async () => {
        if (file) {
          const ConfirmDialog = defineAsyncComponent(
            () => import('../../components/Common/ConfirmDialog.vue'),
          );
          const answer = await this.appManager
            .get(DialogManager)
            .show(ConfirmDialog, {
              header: this.appManager.$t('importExport.importAsset'),
              message: this.appManager.$t('importExport.importAssetConfirm'),
              yesCaption: this.appManager.$t('importExport.importAsset'),
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
    this.appManager.get(UiManager).doTask(async () => {
      const ExportToDocumentDialog = defineAsyncComponent(
        () => import('../../components/Asset/ExportToDocumentDialog.vue'),
      );
      const dialog = this.appManager
        .get(DialogManager)
        .create(ExportToDocumentDialog, {
          workspaceId: workspace.id,
          type,
        });
      await dialog.open();
    });
  }
  async exportWorkspaceToJSON(workspace: Workspace) {
    this.appManager.get(UiManager).showProgressToast(
      async (progress) => {
        const export_settings = this.appManager
          .get(UiPreferenceManager)
          .getPreference(
            'ProjectExportSettings.settings',
            DEFAULT_PROJECT_EXPORT_SETTINGS,
          );
        await this.appManager
          .get(ProjectManager)
          .exportWorkspace(workspace, export_settings);
        progress({
          type: ToastTypes.SUCCESS,
        });
      },
      {
        message: this.appManager.$t('toasts.actionTitles.exportWorkspace'),
        icon: 'ri-upload-2-fill',
      },
    );
  }

  async exportToDocumentAsset(asset: AssetShort, type: 'pdf' | 'md') {
    await this.appManager.get(UiManager).doTask(async () => {
      const ExportToDocumentDialog = defineAsyncComponent(
        () => import('../../components/Asset/ExportToDocumentDialog.vue'),
      );
      await this.appManager.get(DialogManager).show(ExportToDocumentDialog, {
        assetIds: [asset.id],
        type,
      });
    });
  }

  async exportToJSONAsset(asset: AssetShort) {
    await this.appManager.get(UiManager).showProgressToast(
      async (progress) => {
        const export_settings = this.appManager
          .get(UiPreferenceManager)
          .getPreference(
            'ProjectExportSettings.settings',
            DEFAULT_PROJECT_EXPORT_SETTINGS,
          );
        await this.appManager
          .get(ProjectManager)
          .exportAsset(asset, export_settings);
        progress({
          type: ToastTypes.SUCCESS,
        });
      },
      {
        message: this.appManager.$t('toasts.actionTitles.exportAsset'),
        icon: 'ri-upload-2-fill',
      },
    );
  }
  
  protected async saveWithCustomFormat(file: {
      content: Blob;
      name: string;
  }){
    await openBlobFile(file.content, file.name);
  }

  async exportWithCustomFormat(
    asset_type_filter: AssetPropWhere,
    title: string,
  ) {
    const EditFormatsDialog = defineAsyncComponent(
      () => import('../../components/Export/EditFormatsDialog.vue'),
    );
    const res = await this.appManager
      .get(DialogManager)
      .show(EditFormatsDialog, {
        selectable: true,
        assetTypeFilter: asset_type_filter,
        actionType: 'export',
      });
    if (!res || !res.formatId) return;
    const configuration: SyncLocalRootSegment = {
      id: uuidv4(),
      assetFilter: asset_type_filter,
      index: 0,
      saveAs: title,
      formatId: res.formatId,
    };
    await this.appManager.get(UiManager).showProgressToast(
      async (state) => {
        state({
          progress: 0,
        });
        const res = await this.appManager
          .get(LocalFsSyncManager)
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
          message: this.appManager.$t('toasts.actionTitles.exportAsset'),
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
