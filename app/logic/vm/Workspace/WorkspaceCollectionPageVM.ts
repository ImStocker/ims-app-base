import type {
  ApiRequestList,
  ApiResultListWithTotal,
  ProjectFullInfo,
} from '../../types/ProjectTypes';
import CreatorAssetManager, {
  type CreatorWorkspaceEventsArg,
} from '../../managers/CreatorAssetManager';
import {
  WORKSPACE_TYPE_COLLECTION,
  type Workspace,
  type WorkspaceQueryDTOWhere,
} from '../../types/Workspaces';
import type { AssetFullInstanceR } from '../../types/AssetFullInstance';
import {
  applyPropsChange,
  assignPlainValueToAssetProps,
  convertAssetPropsToPlainObject,
  normalizeAssetPropPart,
  type AssetPropValueAsset,
} from '../../types/Props';
import {
  WorkspacePageVM,
  type WorkspacePageVMParams,
} from '../WorkspacePageVM';
import type { IProjectContext } from '../../types/IProjectContext';
import type { AssetShort, AssetQueryWhere } from '../../types/AssetsType';
import ProjectManager from '../../managers/ProjectManager';
import { assert } from '../../utils/typeUtils';
import type { IAppManager } from '../../managers/IAppManager';
import type { IAssetEditorToolbarVM } from '../IAssetEditorToolbarVM';
import type { ExtendedMenuListItem } from '../../types/MenuList';
import { WorkspaceChanger } from './WorkspaceChanger';
import { WorkspaceContentController } from './WorkspaceContentController';
import { convertTranslatedTitle } from '../../utils/assets';
import type { UserView } from '../../../components/Workspace/ViewOptions/viewUtils';
import {
  ViewType,
  VIEW_TYPES_MAP,
} from '../../../components/Workspace/ViewOptions/viewUtils';
import type { ICollectionBlockController } from '../../../../ims-plugins/base/blocks/CollectionBlock/CollectionBlockController';

export class WorkspaceCollectionPageVM
  extends WorkspacePageVM
  implements IProjectContext, IAssetEditorToolbarVM, ICollectionBlockController
{
  public baseAsset: AssetFullInstanceR | null = null;

  public changer = new WorkspaceChanger();
  public assetsContent: WorkspaceContentController;

  public initialLoad = true;

  public subWorkspaces = [] as Workspace[];
  public subWorkspacesLoadingError = null as string | null;
  public subWorkspacesLoading = false;

  private currentViewKey: string | null = null;
  private _unsavedViewData: { [key: string]: Partial<UserView> } = {};

  constructor(appManager: IAppManager, params: WorkspacePageVMParams) {
    super(appManager, params);
    this.searchQuery = params.searchQuery;
    this.assetsContent = new WorkspaceContentController(
      this.appManager,
      this.changer,
      params,
    );
  }

  getWorkspacesList(
    query: ApiRequestList<WorkspaceQueryDTOWhere>,
  ): Promise<ApiResultListWithTotal<Workspace>> {
    return this.appManager.get(CreatorAssetManager).getWorkspacesList(query);
  }

  getAssetInstancesList(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<ApiResultListWithTotal<AssetFullInstanceR>> {
    return this.appManager
      .get(CreatorAssetManager)
      .getAssetInstancesList(query);
  }

  getWorkspaceByIdViaCacheSync(
    workspace_id: string,
  ): Workspace | null | undefined {
    return this.appManager
      .get(CreatorAssetManager)
      .getWorkspaceByIdViaCacheSync(workspace_id);
  }

  getWorkspaceByIdViaCache(workspace_id: string): Promise<Workspace | null> {
    return this.appManager
      .get(CreatorAssetManager)
      .getWorkspaceByIdViaCache(workspace_id);
  }

  get workspacePlainProps() {
    return this.workspace
      ? convertAssetPropsToPlainObject(this.workspace.props)
      : {};
  }

  get workspaceViews(): UserView[] {
    const res: UserView[] = [];
    if (
      this.workspacePlainProps.views &&
      typeof this.workspacePlainProps.views === 'object'
    ) {
      for (const [key, view] of Object.entries(
        this.workspacePlainProps.views,
      ) as [string, Omit<UserView, 'key'>][]) {
        res.push({
          ...view,
          key,
        });
      }
      res.sort((a, b) => a.index - b.index);
    }
    if (res.length === 0) {
      const view_title = convertTranslatedTitle('[[t:Table]]', (...args) =>
        this.appManager.$t(...args),
      );
      res.push({
        filter: null,
        index: 1,
        key: normalizeAssetPropPart(view_title),
        props: [],
        sort: [],
        title: view_title,
        type: ViewType.TABLE,
        ...VIEW_TYPES_MAP[ViewType.TABLE].default(),
      });
    }
    return res;
  }

  get currentView(): UserView {
    if (this.currentViewKey) {
      const view = this.workspaceViews.find(
        (v) => v.key === this.currentViewKey,
      );
      if (view) return view;
    }
    return this.workspaceViews[0];
  }

  get modifiedCurrentView(): UserView {
    let view = this.currentView;
    if (this._unsavedViewData.hasOwnProperty(view.key)) {
      view = {
        ...view,
        ...this._unsavedViewData[view.key],
      };
      if (!view.sort) view.sort = [];
      if (!view.props) view.props = [];
    }
    return view;
  }

  async setCurrentViewKey(new_view_key: string) {
    const exist = this.workspaceViews.find((v) => v.key === new_view_key);
    this.currentViewKey = exist ? exist.key : null;
    this.assetsContent.flushRecentlyAddedIds();
    await this._loadAssetsContent(false);
  }

  override async load() {
    try {
      this.isLoading = true;
      await super.load();
      const workspace = this.workspace;
      if (workspace && workspace.props.type === WORKSPACE_TYPE_COLLECTION) {
        const asset_link = workspace.props.asset;
        if ((asset_link as AssetPropValueAsset).AssetId) {
          this.baseAsset = await this.appManager
            .get(CreatorAssetManager)
            .getAssetInstance((asset_link as AssetPropValueAsset).AssetId);
        }
      }
      if (!this.baseAsset) {
        throw new Error('Base asset not found');
      }
      await this.loadContent();
      this.isLoading = false;
    } catch (err: any) {
      this.loadError = err.message.toString();
      this.isLoading = false;
    }
  }

  private async _loadSubWorkspaces() {
    try {
      this.subWorkspacesLoading = true;
      if (this.workspace) {
        this.subWorkspaces = (
          await this.appManager.get(CreatorAssetManager).getWorkspacesList({
            where: {
              parentId: this.workspaceId,
            },
          })
        ).list;
      }
    } catch (err: any) {
      this.subWorkspacesLoadingError = err.message;
    } finally {
      this.subWorkspacesLoading = false;
    }
  }

  private async _loadAssetsContent(reset = false) {
    this.assetsContent.setProps(this.modifiedCurrentView.props ?? []);
    this.assetsContent.setSort(this.modifiedCurrentView.sort ?? []);
    this.assetsContent.setFilter(this.modifiedCurrentView.filter ?? null);
    await this.assetsContent.reload(reset);
  }

  async loadContent() {
    await Promise.all([
      this._loadAssetsContent(true),
      this._loadSubWorkspaces(),
    ]);
    this.initialLoad = false;
  }

  override async _handleWorkspacesEvents(
    change_res: CreatorWorkspaceEventsArg,
  ) {
    super._handleWorkspacesEvents(change_res);
    for (const workspace of change_res.upsert) {
      if ((workspace.props.asset as any)?.AssetId) {
        this.baseAsset =
          (await this.appManager
            .get(CreatorAssetManager)
            .getAssetInstance((workspace.props.asset as any)?.AssetId)) ?? null;
      }
    }
  }

  override toJSON(): Record<string, any> {
    const base_json = super.toJSON();
    const asset_full_preserved = this.baseAsset
      ? this.appManager
          .get(CreatorAssetManager)
          .serializeAssetFullInstances([this.baseAsset])
      : null;
    return {
      ...base_json,
      baseAssetResult: asset_full_preserved,
      subWorkspaces: this.subWorkspaces,
      subWorkspacesLoadingError: this.subWorkspacesLoadingError,
      subWorkspacesLoading: this.subWorkspacesLoading,
      assetsContent: this.assetsContent.toJSON(),
      initialLoad: this.initialLoad,
    };
  }

  override loadJSON(data: Record<string, any>): void {
    super.loadJSON(data);
    const creatorAssetManager = this.appManager.get(CreatorAssetManager);

    if (data.subWorkspaces) {
      creatorAssetManager.updateWorkspacesCache(data.subWorkspaces);
      this.subWorkspaces = data.subWorkspaces.map((w) =>
        creatorAssetManager.getWorkspaceByIdViaCacheSync(w.id),
      );
    }
    this.subWorkspacesLoading = data.subWorkspacesLoading;
    this.subWorkspacesLoadingError = data.subWorkspacesLoadingError;

    this.assetsContent.loadJSON(data.assetsContent);

    this.initialLoad = data.initialLoad;

    if (data.baseAssetResult && data.baseAssetResult.ids.length > 0) {
      creatorAssetManager.updateFullInstanceCache(data.baseAssetResult);
      this.baseAsset =
        creatorAssetManager.getAssetInstanceViaCacheSync(
          data.baseAssetResult.ids[0],
        ) ?? null;
    }
  }

  getAssetShortViaCacheSync(assetId: string): AssetShort | null | undefined {
    return this.appManager
      .get(CreatorAssetManager)
      .getAssetShortViaCacheSync(assetId);
  }
  getAssetShortViaCache(assetId: string): Promise<AssetShort | null> {
    return this.appManager
      .get(CreatorAssetManager)
      .getAssetShortViaCache(assetId);
  }
  requestAssetShortInCache(assetId: string): Promise<void> {
    return this.appManager
      .get(CreatorAssetManager)
      .requestAssetShortInCache(assetId);
  }
  getAssetShortsList(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<ApiResultListWithTotal<AssetShort>> {
    return this.appManager.get(CreatorAssetManager).getAssetShortsList(query);
  }
  getAssetInstance(
    assetId: string,
    refresh?: boolean,
  ): Promise<AssetFullInstanceR | null> {
    return this.appManager
      .get(CreatorAssetManager)
      .getAssetInstance(assetId, refresh);
  }

  checkHasChildrenViaCache(assetId: string): Promise<boolean | null> {
    return this.appManager
      .get(CreatorAssetManager)
      .checkHasChildrenViaCache(assetId);
  }

  get projectInfo(): ProjectFullInfo {
    const project_info = this.appManager.get(ProjectManager).getProjectInfo();
    assert(project_info);
    return project_info;
  }

  getToolbarActions(): ExtendedMenuListItem[] {
    return [];
  }

  getHasChanges(): boolean {
    return (
      this.assetsContent.dirtyChanges.size > 0 ||
      this.assetsContent.hasItemRecentlyAdded
    );
  }

  isSaving(): boolean {
    return (
      this.changer.isSaving() ||
      this.assetsContent.addBusy ||
      this.assetsContent.savingBusy
    );
  }

  isUndoRedoBusy(): false | 'undo' | 'redo' {
    return this.changer.isUndoRedoBusy();
  }

  canUndo(): boolean {
    if (this.assetsContent.dirtyChanges.size > 0) {
      return true;
    }
    return this.changer.canUndo();
  }

  canRedo(): boolean {
    return this.changer.canRedo();
  }

  async undo(): Promise<void> {
    if (this.assetsContent.dirtyChanges.size > 0) {
      this.assetsContent.dirtyChanges.clear();
    }
    await this.changer.undo();
  }

  async redo(): Promise<void> {
    await this.changer.redo();
  }

  async saveChanges(): Promise<boolean> {
    await this.assetsContent.saveDirtyChanges();
    this.assetsContent.flushRecentlyAddedIds();
    return true;
  }

  async changeCurrentView<Key extends keyof UserView>(
    prop: Key,
    value: UserView[Key],
  ) {
    if (!this._unsavedViewData.hasOwnProperty(this.currentView.key)) {
      this._unsavedViewData[this.currentView.key] = {};
    }
    this._unsavedViewData[this.currentView.key][prop] = value;
    if (prop === 'sort') {
      this.assetsContent.flushRecentlyAddedIds();
    }
    await this._loadAssetsContent(false);
  }

  isChangedCurrentView(prop: keyof UserView): boolean {
    if (!this._unsavedViewData.hasOwnProperty(this.currentView.key)) {
      return false;
    }
    if (!this._unsavedViewData[this.currentView.key].hasOwnProperty(prop)) {
      return false;
    }
    const new_val = this._unsavedViewData[this.currentView.key][prop];
    const old_val = this.currentView[prop];
    if (new_val === old_val) return false;
    if (
      new_val &&
      old_val &&
      JSON.stringify(new_val) === JSON.stringify(old_val)
    ) {
      return false;
    }
    return true;
  }

  async saveWorkspaceViews(views_map: { [key: string]: UserView }) {
    assert(this.workspace);

    const new_workspace_props = { ...this.workspace.props };
    const change_res = applyPropsChange(new_workspace_props, null, [
      assignPlainValueToAssetProps(
        {
          '~views': null,
        },
        {
          views: views_map,
        },
      ),
    ]);

    await this.gameDesignMenuVM.editWorkspace(this.workspace.id, {
      props: change_res.props,
    });
  }

  async saveCurrentView() {
    const current_key = this.currentView.key;
    const new_user_views = {
      ...((this.workspacePlainProps?.views as { [key: string]: UserView }) ??
        {}),
    };
    new_user_views[current_key] = this.modifiedCurrentView;

    await this.saveWorkspaceViews(new_user_views);

    if (this._unsavedViewData.hasOwnProperty(current_key)) {
      delete this._unsavedViewData[current_key];
    }
  }
}
