import CreatorAssetManager from '../managers/CreatorAssetManager';
import {
  WORKSPACE_TYPE_COLLECTION,
  type ChangeWorkspaceRequest,
  type Workspace,
} from '../types/Workspaces';
import type {
  AssetForSelection,
  AssetShort,
  AssetWhereParams,
} from '../types/AssetsType';
import DialogManager from '../managers/DialogManager';
import UiManager from '../managers/UiManager';
import PromptDialog from '../../components/Common/PromptDialog.vue';
import FastCreateAssetDialog from '../../components/Asset/FastCreateAssetDialog.vue';
import { markRaw, unref } from 'vue';
import ProjectManager from '../managers/ProjectManager';
import { assert } from '../utils/typeUtils';
import type { ProjectTreeSelectedItem } from './IProjectTreePresenterVM';
import ConfirmDialog from '../../components/Common/ConfirmDialog.vue';
import { openProjectLink } from '../router/routes-helpers';
import { convertTranslatedTitle } from '../utils/assets';
import { DISCUSSION_ASSET_ID } from '../constants';
import {
  MIN_ASSET_RIGHTS_TO_READ,
  MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT,
  MIN_WORKSPACE_RIGHTS_TO_CHANGE,
  MIN_WORKSPACE_RIGHTS_TO_READ,
  MIN_WORKSPACE_RIGHTS_TO_RENAME,
} from '../types/Rights';
import type { ExtendedMenuListItem } from '../types/MenuList';
import SetUpAccessDialog from '../../components/Asset/Rights/SetUpAccessDialog.vue';
import AssetLinksDialog from '../../components/Asset/AssetLinksDialog.vue';
import AssetSettingsDialog from '../../components/Asset/AssetSettingsDialog.vue';
import CreateWorkspaceDialog from '../../components/Asset/CreateWorkspaceDialog.vue';
import type {
  AssetProps,
  AssetPropValueAsset,
  AssetPropValueSelection,
} from '../types/Props';
import ChangeCollectionTypeDialog from '../../components/Asset/ChangeCollectionTypeDialog.vue';
import { isWorkspaceInsideCollection } from '../../components/GameDesign/workspaceUtils';
import ProjectContentManager from '../managers/ProjectContentManager';
import {
  getDefaultProjectTreePresenterVMOptions,
  ProjectTreePresenterVM,
  type ProjectTreePresenterVMOptions,
} from '../../components/Asset/ProjectTree/ProjectTreePresenterVM';
import type { IAppManager } from '../managers/IAppManager';
import {
  TREE_PRESENTER_ROOT_STATE_ID,
  type TreePresenterItem,
} from '../../components/Common/TreePresenter/TreePresenter';
import type { ProjectTreeItemPayload } from '../../components/Asset/ProjectTree/ProjectTreePresenterBaseVM';

export class GameDesignMenuVM extends ProjectTreePresenterVM {
  private _searchValue: AssetPropValueSelection | null = null;

  constructor(
    appManager: IAppManager,
    public rootWorkspaceId: string | null,
  ) {
    super(appManager, getDefaultProjectTreePresenterVMOptions());
    this.setOptions(this._getTreePresenterOptions());
  }

  public get searchValue(): AssetPropValueSelection | null {
    return this._searchValue;
  }

  public set searchValue(val: AssetPropValueSelection | null) {
    this._searchValue = val;
    this.setOptions(this._getTreePresenterOptions());
  }

  private _getTreePresenterOptions(): ProjectTreePresenterVMOptions {
    return {
      showWorkspaceTree: !this.searchValue,
      assetWhere: {
        ...(this.searchValue ? this.searchValue.Where : {}),
        issystem: false,
        workspaceids: this.rootWorkspaceId,
      },
      allowDragChange: true,
      additionalOptions: [],
      allowSelectWorkspaces: true,
      hideNonAlternativeWorkspaces: false,
      showAssetInheritance: false,
      showAssetContent: this.type === 'gdd',
      hideEmptyWorkspaces: false,
    };
  }

  get rootWorkspaceCached() {
    if (this.rootWorkspaceId === null) return null;
    return this.appManager
      .get(CreatorAssetManager)
      .getWorkspaceByIdViaCacheSync(this.rootWorkspaceId);
  }

  get rootWorkspaceCachedParents(): string[] {
    const res: string[] = [];
    const recursive = (w: Workspace) => {
      res.unshift(w.id);
      if (w.parentId) {
        const parent = this.appManager
          .get(CreatorAssetManager)
          .getWorkspaceByIdViaCacheSync(w.parentId);
        if (parent) recursive(parent);
      }
    };
    if (this.rootWorkspaceCached) {
      recursive(this.rootWorkspaceCached);
    }
    return res;
  }

  get type(): 'gdd' | 'discussions' {
    const discussions_workspace_id = this.appManager
      .get(ProjectManager)
      .getWorkspaceIdByName('discussions');
    const parents = this.rootWorkspaceCachedParents;
    if (
      discussions_workspace_id &&
      parents.includes(discussions_workspace_id)
    ) {
      return 'discussions';
    } else {
      return 'gdd';
    }
  }

  get selection(): ProjectTreeSelectedItem[] {
    const selectedAssetId = unref(this.appManager.getRouter().currentRoute)
      .params.assetId;
    if (selectedAssetId) {
      const id = Array.isArray(selectedAssetId)
        ? selectedAssetId[0]
        : selectedAssetId;
      return [{ id: id, type: 'asset' }];
    }
    const selectedWorkspaceId = unref(this.appManager.getRouter().currentRoute)
      .params.workspaceId;
    if (selectedWorkspaceId) {
      const id = Array.isArray(selectedWorkspaceId)
        ? selectedWorkspaceId[0]
        : selectedWorkspaceId;
      return [{ id: id, type: 'workspace' }];
    }
    return [];
  }

  set selection(val: ProjectTreeSelectedItem[]) {
    if (val.length === 0) return;
    if (val[0].type === 'asset') {
      openProjectLink(this.appManager, this.getProjectInfo(), {
        name: 'project-asset-by-id',
        params: {
          assetId: val[0].id,
        },
      });
    } else if (val[0].type === 'workspace') {
      openProjectLink(this.appManager, this.getProjectInfo(), {
        name: 'project-workspace-by-id',
        params: {
          workspaceId: val[0].id,
        },
      });
    }
  }

  getAssetMenu(asset: AssetShort): ExtendedMenuListItem[] {
    const assetActions = [] as ExtendedMenuListItem[];
    const is_desktop = this.appManager.$appConfiguration.isDesktop;
    assetActions.push({
      title: this.appManager.$t('common.contextMenu.openPageInNewTab'),
      action: () =>
        openProjectLink(
          this.appManager,
          this.getProjectInfo(),
          {
            name: 'project-asset-by-id',
            params: {
              assetId: asset.id,
            },
          },
          true,
        ),
      icon: 'newTab',
    });
    if (is_desktop) {
      assetActions.push({
        title: this.appManager.$t(
          'mainMenu.' +
            (process.platform === 'darwin' ? 'showInFinder' : 'showInExplorer'),
        ),
        icon: 'ri-folder-open-line',
        action: async () => {
          const asset_local_path = is_desktop
            ? await this.appManager
                .get(CreatorAssetManager)
                .getAssetLocalPath(asset.id)
            : null;
          if (asset_local_path) {
            await window.imshost.shell.showItemInFolder(asset_local_path);
          }
        },
      });
    }
    assetActions.push({
      type: 'separator',
    });
    if (
      this.appManager.get(ProjectManager).isAdmin() &&
      this.rootWorkspaceCached &&
      this.rootWorkspaceCached.rights >= MIN_WORKSPACE_RIGHTS_TO_CHANGE &&
      !is_desktop
    ) {
      assetActions.push({
        title: this.appManager.$t('gddPage.setUpAccess'),
        action: () =>
          this.appManager.get(DialogManager).show(SetUpAccessDialog, {
            assetId: asset.id,
          }),
        icon: 'ri-lock-fill',
      });
    }
    const asset_is_discussion =
      asset.typeIds && asset.typeIds.includes(DISCUSSION_ASSET_ID);
    if (this.appManager.get(CreatorAssetManager).canChangeAsset(asset)) {
      assetActions.push({
        title: this.appManager.$t('gddPage.settings'),
        icon: 'settings',
        action: () =>
          this.appManager.get(DialogManager).show(AssetSettingsDialog, {
            assetIds: [asset.id],
          }),
      });
    }
    if (asset.rights >= MIN_ASSET_RIGHTS_TO_READ) {
      assetActions.push({
        title: this.appManager.$t('gddPage.showLinks'),
        icon: 'links',
        action: () =>
          this.appManager.get(DialogManager).show(AssetLinksDialog, {
            assetIds: [asset.id],
          }),
      });
    }
    if (
      this.appManager.get(CreatorAssetManager).canCreateAsset() &&
      this.rootWorkspaceCached &&
      this.rootWorkspaceCached.rights >= MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT &&
      !asset_is_discussion
    ) {
      assetActions.push({
        title: this.appManager.$t('common.dialogs.duplicate'),
        action: () => this.copyElement(asset),
        icon: 'copy',
      });
      assetActions.push({
        title: this.appManager.$t('asset.createInstance'),
        action: () => this.createAsset(asset.workspaceId, asset.id),
      });
    }
    if (this.appManager.get(CreatorAssetManager).canRenameAsset(asset)) {
      assetActions.push({
        title: this.appManager.$t('common.dialogs.rename'),
        action: () => this.renameElement(asset),
        icon: 'edit',
      });
    }
    if (!asset_is_discussion) {
      assetActions.push({
        title: this.appManager.$t('gddPage.export'),
        icon: 'export',
        children: [
          {
            title: this.appManager.$t('gddPage.exportToMD'),
            action: async () =>
              await this.appManager
                .get(ProjectContentManager)
                .exportToDocumentAsset(asset, 'md'),
          },
          {
            title: this.appManager.$t('gddPage.exportToPDF'),
            action: async () =>
              await this.appManager
                .get(ProjectContentManager)
                .exportToDocumentAsset(asset, 'pdf'),
          },
          {
            title: this.appManager.$t('gddPage.exportToJSON'),
            action: async () =>
              await this.appManager
                .get(ProjectContentManager)
                .exportToJSONAsset(asset),
          },

          {
            title: this.appManager.$t('gddPage.exportWithCustomFormat'),
            action: () =>
              this.appManager
                .get(ProjectContentManager)
                .exportAssetWithCustomFormat(asset),
          },
        ],
      });
    }
    if (this.appManager.get(CreatorAssetManager).canDeleteAsset(asset)) {
      assetActions.push({
        title: this.appManager.$t('sourcePage.elements.delete'),
        action: () => this.deleteAssetMenu(asset),
        icon: 'delete',
        danger: true,
      });
    }
    return assetActions;
  }
  getWorkspaceMenu(workspace: Workspace): ExtendedMenuListItem[] {
    const workspaceActions = [] as ExtendedMenuListItem[];
    const has_parent = !!workspace.parentId;
    const is_desktop = this.appManager.$appConfiguration.isDesktop;
    workspaceActions.push({
      title: this.appManager.$t('common.contextMenu.openPageInNewTab'),
      action: () =>
        openProjectLink(
          this.appManager,
          this.getProjectInfo(),
          {
            name: 'project-workspace-by-id',
            params: {
              workspaceId: workspace.id,
            },
          },
          true,
        ),
      icon: 'newTab',
    });
    if (is_desktop) {
      workspaceActions.push({
        title: this.appManager.$t(
          'mainMenu.' +
            (process.platform === 'darwin' ? 'openInFinder' : 'openInExplorer'),
        ),
        icon: 'ri-folder-open-line',
        action: async () => {
          const workspace_local_path = is_desktop
            ? await this.appManager
                .get(CreatorAssetManager)
                .getWorkspaceLocalPath(workspace.id)
            : null;
          if (workspace_local_path) {
            await window.imshost.shell.showFolder(workspace_local_path);
          }
        },
      });
    }
    workspaceActions.push({
      type: 'separator',
    });
    if (
      this.appManager.get(ProjectManager).isAdmin() &&
      workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_CHANGE &&
      !is_desktop
    ) {
      workspaceActions.push({
        title: this.appManager.$t('gddPage.setUpAccess'),
        action: () =>
          this.appManager.get(DialogManager).show(SetUpAccessDialog, {
            workspaceId: workspace.id,
          }),
        icon: 'ri-lock-fill',
      });
    }

    if (workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT) {
      let create_element_menu_item: ExtendedMenuListItem = {
        icon: 'ri-file-add-fill',
        isMain: true,
      };
      if (
        this.type === 'discussions' ||
        workspace.props.type === 'collection'
      ) {
        create_element_menu_item = {
          ...create_element_menu_item,
          title: this.appManager.$t(
            'sourcePage.' +
              (this.type === 'discussions' ? 'discussions' : 'elements') +
              '.create',
          ),
          action: () => {
            let base_type = undefined as string | undefined;
            if (
              workspace.props.type === 'collection' &&
              workspace.props.asset
            ) {
              if ((workspace.props.asset as AssetPropValueAsset).AssetId) {
                base_type = (workspace.props.asset as AssetPropValueAsset)
                  .AssetId;
              }
            }
            this.createAsset(workspace.id, base_type);
          },
        };
      } else {
        create_element_menu_item = {
          ...create_element_menu_item,
          title: this.appManager.$t('sourcePage.elements.create'),
          children: [
            {
              name: 'createElement',
            },
          ],
        };
      }
      workspaceActions.push(create_element_menu_item);

      let create_folder_menu_item: ExtendedMenuListItem = {
        icon: 'ri-folder-add-line',
        isMain: true,
      };
      if (
        this.type === 'discussions' ||
        workspace.props.type === 'collection'
      ) {
        create_folder_menu_item = {
          ...create_folder_menu_item,
          title: this.appManager.$t('sourcePage.folders.create'),
          action: () => {
            this.createFolder({
              parentId: workspace.id,
              type:
                workspace.props.type === 'collection'
                  ? workspace.props.type
                  : undefined,
              props: {
                asset: workspace.props.asset,
              },
              fixedCollection: workspace.props.type === 'collection',
            });
          },
        };
      } else {
        create_folder_menu_item = {
          ...create_folder_menu_item,
          title: this.appManager.$t('sourcePage.folders.create'),
          children: [
            {
              name: 'createFolder',
            },
          ],
        };
      }

      workspaceActions.push(create_folder_menu_item);
    }
    if (workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_RENAME && has_parent) {
      workspaceActions.push({
        title: this.appManager.$t('common.dialogs.rename'),
        action: () => this.renameWorkspace(workspace),
        icon: 'edit',
      });
      if (
        workspace.props.type === WORKSPACE_TYPE_COLLECTION &&
        !isWorkspaceInsideCollection(this.appManager, workspace.id)
      ) {
        workspaceActions.push({
          title: this.appManager.$t(
            'sourcePage.folders.collection.changeCollectionType',
          ),
          action: () => this.changeCollectionType(workspace),
          icon: 'settings',
        });
      }
      workspaceActions.push({
        title: this.appManager.$t('assetEditor.blockMenu.setServiceName'),
        action: () => this.setServiceName(workspace),
        icon: 'serviceName',
      });
    }
    if (
      workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_READ &&
      this.type !== 'discussions'
    ) {
      workspaceActions.push({
        title: this.appManager.$t('gddPage.export'),
        icon: 'export',
        children: [
          {
            title: this.appManager.$t('gddPage.exportToMD'),
            action: () =>
              this.appManager
                .get(ProjectContentManager)
                .exportWorkspaceToDocument(workspace, 'md'),
          },
          {
            title: this.appManager.$t('gddPage.exportToPDF'),
            action: () =>
              this.appManager
                .get(ProjectContentManager)
                .exportWorkspaceToDocument(workspace, 'pdf'),
          },
          {
            title: this.appManager.$t('gddPage.exportToJSON'),
            action: () =>
              this.appManager
                .get(ProjectContentManager)
                .exportWorkspaceToJSON(workspace),
          },
          ...(workspace.props.type == 'collection'
            ? [
                {
                  title: this.appManager.$t('gddPage.exportWithCustomFormat'),
                  action: () =>
                    this.appManager
                      .get(ProjectContentManager)
                      .exportCollectionWithCustomFormat(workspace),
                },
              ]
            : []),
        ],
      });
    }
    if (
      workspace.rights >= MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT &&
      this.type !== 'discussions' &&
      !is_desktop
    ) {
      workspaceActions.push({
        title: this.appManager.$t('gddPage.import'),
        action: () =>
          this.appManager.get(ProjectContentManager).importAsset(workspace),
        icon: 'import',
      });
    }
    if (
      this.appManager.get(CreatorAssetManager).canDeleteWorkspace(workspace) &&
      has_parent
    ) {
      workspaceActions.push({
        title: this.appManager.$t('sourcePage.folders.delete'),
        action: () => this.deleteWorkspaceMenu(workspace),
        danger: true,
        icon: 'delete',
      });
    }

    return workspaceActions;
  }

  getProjectInfo() {
    const res = this.appManager.get(ProjectManager).getProjectInfo();
    assert(res);
    return res;
  }

  private async _openNewElement(id: string) {
    const project_info = this.appManager.get(ProjectManager).getProjectInfo();
    if (!project_info) return;
    openProjectLink(this.appManager, project_info, {
      name: 'project-asset-by-id',
      params: {
        assetId: id,
      },
    });
  }

  async createAsset(
    parent_workspace_id?: string | null,
    parent_asset_id?: string,
  ): Promise<void> {
    await this.appManager.get(UiManager).doTask(async () => {
      let fast_create_dialog;
      if (this.type === 'gdd') {
        fast_create_dialog = markRaw(
          this.appManager.get(DialogManager).create(FastCreateAssetDialog, {
            set: {
              workspaceId: parent_workspace_id,
              parentIds: parent_asset_id ? [parent_asset_id] : [],
            },
          }),
        );
      } else {
        fast_create_dialog = markRaw(
          this.appManager.get(DialogManager).create(FastCreateAssetDialog, {
            set: {
              workspaceId: parent_workspace_id,
              parentIds: [DISCUSSION_ASSET_ID],
            },
            disableChangeType: true,
            disableChangeWorkspace: true,
          }),
        );
      }
      const new_asset = await fast_create_dialog.open();
      if (new_asset) {
        await this._openNewElement(new_asset.id);
      }
    });
  }

  async renameAsset(id: string, title: string) {
    await this.appManager.get(CreatorAssetManager).changeAssets({
      where: {
        id: id,
      },
      set: {
        title,
      },
    });
  }

  async copyAsset(id: string, title: string) {
    const res = await this.appManager
      .get(CreatorAssetManager)
      .copyAsset(id, title);
    await this._openNewElement(res.ids[0]);
  }

  async deleteAsset(params: { where: AssetWhereParams }) {
    await this.appManager.get(CreatorAssetManager).deleteAssets(params);
  }

  async copyElement(asset: AssetShort) {
    let title = asset.title ?? '';
    if (title) title += ' - 2';
    const new_title = await this.appManager
      .get(DialogManager)
      .show(PromptDialog, {
        header: this.appManager.$t('sourcePage.elements.copy', {
          element: convertTranslatedTitle(asset.title ?? '', (...args) =>
            this.appManager.$t(...args),
          ),
        }),
        message: this.appManager.$t('sourcePage.elements.inputElementName'),
        yesCaption: this.appManager.$t('common.dialogs.copy'),
        value: title,
      });
    if (new_title) {
      await this.appManager.get(UiManager).doTask(async () => {
        await this.copyAsset(asset.id, new_title);
      });
    }
  }

  async renameElement(asset: AssetShort) {
    const new_title = await this.appManager
      .get(DialogManager)
      .show(PromptDialog, {
        header: this.appManager.$t('sourcePage.elements.rename', {
          element: convertTranslatedTitle(asset.title ?? '', (...args) =>
            this.appManager.$t(...args),
          ),
        }),
        message: this.appManager.$t('sourcePage.elements.inputElementName'),
        yesCaption: this.appManager.$t('common.dialogs.rename'),
        value: asset?.title ?? '',
      });
    if (new_title) {
      await this.appManager.get(UiManager).doTask(async () => {
        await this.appManager.get(CreatorAssetManager).changeAssets({
          where: {
            id: asset.id,
          },
          set: {
            title: new_title,
          },
        });
      });
    }
  }

  async deleteAssetMenu(asset: AssetShort) {
    const answer = await this.appManager
      .get(DialogManager)
      .show(ConfirmDialog, {
        header: this.appManager.$t('sourcePage.elements.delete') + '?',
        message: this.appManager.$t(
          'sourcePage.elements.deleteElementConfirm',
          {
            element: convertTranslatedTitle(asset.title ?? '', (...args) =>
              this.appManager.$t(...args),
            ),
          },
        ),
        yesCaption: this.appManager.$t('common.dialogs.delete'),
        danger: true,
      });
    if (answer) {
      await this.appManager.get(UiManager).doTask(async () => {
        this.deleteAsset({
          where: {
            id: [asset.id],
          },
        });
        this.deleteItemInState(`asset:${asset.id}`);
      });
      return true;
    }
  }

  //-------------------------workspaces actions---------------------------------

  async createFolder(options?: {
    title?: string;
    parentId?: string | null;
    type?: 'folder' | 'collection';
    props?: AssetProps;
    fixedCollection?: boolean;
  }): Promise<void> {
    const parentId =
      options?.parentId ??
      this.appManager.get(ProjectManager).getWorkspaceIdByName('gdd');
    const res = await this.appManager
      .get(DialogManager)
      .show(CreateWorkspaceDialog, {
        ...(options ?? {}),
        parentId,
        allowedTypes: this.type === 'discussions' ? ['folder'] : undefined,
      });
    if (res && res.type === WORKSPACE_TYPE_COLLECTION) {
      openProjectLink(this.appManager, this.getProjectInfo(), {
        name: 'project-workspace-by-id',
        params: {
          workspaceId: res.entity.id,
        },
      });
    }
  }

  async editWorkspace(workspace_id: string, params: ChangeWorkspaceRequest) {
    await this.appManager
      .get(CreatorAssetManager)
      .changeWorkspace(workspace_id, params);
  }

  async deleteWorkspace(workspace_id: string) {
    await this.appManager
      .get(CreatorAssetManager)
      .deleteWorkspace(workspace_id);
    this.deleteItemInState(`workspace:${workspace_id}`);
  }
  async deleteWorkspaceMenu(workspace: Workspace) {
    const answer = await this.appManager
      .get(DialogManager)
      .show(ConfirmDialog, {
        header: this.appManager.$t('sourcePage.folders.delete') + '?',
        message: this.appManager.$t(
          'sourcePage.folders.deleteWorkspaceConfirm',
          {
            workspace: convertTranslatedTitle(
              workspace.title ?? '',
              (...args) => this.appManager.$t(...args),
            ),
          },
        ),
        yesCaption: this.appManager.$t('common.dialogs.delete'),
        danger: true,
      });
    if (answer) {
      await this.appManager.get(UiManager).doTask(async () => {
        this.deleteWorkspace(workspace.id);
      });
      return true;
    }
    return false;
  }
  async setServiceName(workspace: Workspace) {
    const new_name = await this.appManager
      .get(DialogManager)
      .show(PromptDialog, {
        header: this.appManager.$t('sourcePage.folders.edit', {
          workspace: convertTranslatedTitle(workspace.title ?? '', (...args) =>
            this.appManager.$t(...args),
          ),
        }),
        message: this.appManager.$t('assetEditor.blockMenu.inputServiceName'),
        yesCaption: this.appManager.$t('common.dialogs.rename'),
        value: workspace.name ?? '',
      });
    if (new_name !== undefined) {
      await this.appManager.get(UiManager).doTask(async () => {
        await this.appManager
          .get(CreatorAssetManager)
          .changeWorkspace(workspace.id, {
            name: new_name ? new_name : null,
          });
      });
    }
  }
  async renameWorkspace(workspace: Workspace) {
    const new_title = await this.appManager
      .get(DialogManager)
      .show(PromptDialog, {
        header: this.appManager.$t('sourcePage.folders.edit', {
          workspace: convertTranslatedTitle(workspace.title ?? '', (...args) =>
            this.appManager.$t(...args),
          ),
        }),
        message: this.appManager.$t('sourcePage.folders.inputFolderName'),
        yesCaption: this.appManager.$t('common.dialogs.rename'),
        value: workspace.title ?? '',
      });
    if (new_title) {
      await this.appManager.get(UiManager).doTask(async () => {
        await this.appManager
          .get(CreatorAssetManager)
          .changeWorkspace(workspace.id, {
            title: new_title,
          });
      });
    }
  }

  async changeCollectionType(workspace: Workspace) {
    let current_type: AssetForSelection | null = null;
    if ((workspace.props.asset as any)?.AssetId) {
      const collection_type = await this.appManager
        .get(CreatorAssetManager)
        .getAssetShortViaCache((workspace.props.asset as any)?.AssetId);
      if (collection_type) {
        current_type = {
          id: collection_type.id,
          title: collection_type.title,
          name: collection_type.name,
          icon: collection_type.icon,
        };
      }
    }
    await this.appManager.get(DialogManager).show(ChangeCollectionTypeDialog, {
      workspaceId: workspace.id,
      collectionType: current_type,
    });
  }

  async expandWorkspaceIds(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    if (!this.isLoaded) {
      await this.load();
    }

    const workspaces = await Promise.all(
      ids.map((id) =>
        this.appManager.get(CreatorAssetManager).getWorkspaceByIdViaCache(id),
      ),
    );
    const loading_items: TreePresenterItem<ProjectTreeItemPayload>[] = [];
    for (const workspace of workspaces) {
      if (!workspace) continue;
      if (workspace.id === this.loadedRootWorkspaceId) continue;
      const workspace_item = this.makeItemForWorkspace(workspace);
      loading_items.push(workspace_item);
      this.setExpanded(workspace_item.id, true);
    }

    await Promise.all(
      loading_items.map((item) => {
        return this.requestChildren(item, false);
      }),
    );
  }

  isLoaded() {
    const node = this.getState(TREE_PRESENTER_ROOT_STATE_ID);
    return node ? node.loaded : false;
  }

  async load() {
    this.setOptions(this._getTreePresenterOptions());
    await this.requestChildren(null, false);
  }
}
