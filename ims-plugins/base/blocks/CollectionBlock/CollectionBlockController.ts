import type { UserView } from '#components/Workspace/ViewOptions/viewUtils';
import {
  ViewType,
  VIEW_TYPES_MAP,
} from '#components/Workspace/ViewOptions/viewUtils';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';
import type { IAppManager } from '#logic/managers/IAppManager';
import type { ExtendedMenuListItem } from '#logic/types/MenuList';
import {
  normalizeAssetPropPart,
  applyPropsChange,
  assignPlainValueToAssetProps,
} from '#logic/types/Props';
import type { AssetPropWhere } from '#logic/types/PropsWhere';
import { convertTranslatedTitle } from '#logic/utils/assets';
import { assert } from '#logic/utils/typeUtils';
import type { IAssetEditorToolbarVM } from '#logic/vm/IAssetEditorToolbarVM';
import { WorkspaceChanger } from '#logic/vm/Workspace/WorkspaceChanger';
import { WorkspaceContentController } from '#logic/vm/Workspace/WorkspaceContentController';

export interface ICollectionBlockController {
  workspaceId?: string | null;
  assetsContent: WorkspaceContentController;
  isSaving(): boolean;
  initialLoad: any;
  workspaceViews: UserView[];
  searchQuery: AssetPropWhere;
  currentView: UserView;
  modifiedCurrentView: UserView;
  setCurrentViewKey(new_view_key: string): Promise<void>;
  changeCurrentView<Key extends keyof UserView>(
    prop: Key,
    value: UserView[Key],
  ): Promise<void>;
  isChangedCurrentView(prop: keyof UserView): boolean;
  saveWorkspaceViews(views_map: { [key: string]: UserView }): Promise<void>;
  saveCurrentView(): Promise<void>;
}

export type CollectionBlockEditorControllerParams = {
  searchQuery?: AssetPropWhere;
  readViews(): { [key: string]: UserView };
  writeViews(): Promise<void>;
};

export class CollectionBlockEditorController
  implements ICollectionBlockController, IAssetEditorToolbarVM
{
  private currentViewKey: string | null = null;
  private _unsavedViewData: { [key: string]: Partial<UserView> } = {};
  public assetsContent: WorkspaceContentController;
  public appManager: IAppManager;
  public changer = new WorkspaceChanger();
  searchQuery: AssetPropWhere;
  views: { [key: string]: UserView };

  constructor(
    appManager: IAppManager,
    params: CollectionBlockEditorControllerParams,
  ) {
    this.appManager = appManager;
    this.searchQuery = params.searchQuery ?? {};
    this.views = params.readViews();
    this.assetsContent = new WorkspaceContentController(
      this.appManager,
      this.changer,
      {
        searchQuery: params.searchQuery,
      },
    );
  }
  initialLoad: any;

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
  async loadContent() {
    await Promise.all([this._loadAssetsContent(true)]);
  }

  private async _loadAssetsContent(reset = false) {
    this.assetsContent.setProps(this.modifiedCurrentView.props ?? []);
    this.assetsContent.setSort(this.modifiedCurrentView.sort ?? []);
    this.assetsContent.setFilter(this.modifiedCurrentView.filter);
    await this.assetsContent.reload(reset);
  }

  get workspaceId(): string | null {
    if (this.searchQuery) {
      for (const field of ['workspaceid', 'workspaceids']) {
        if (typeof this.searchQuery[field] === 'string') {
          return this.searchQuery[field];
        } else if (
          Array.isArray(this.searchQuery[field]) &&
          this.searchQuery[field].length === 1 &&
          typeof this.searchQuery[field][0] === 'string'
        ) {
          return this.searchQuery[field][0];
        }
      }
    }
    return null;
  }

  get workspaceViews(): UserView[] {
    const res: UserView[] = [];
    if (this.views && typeof this.views === 'object') {
      for (const [key, view] of Object.entries(this.views) as [
        string,
        Omit<UserView, 'key'>,
      ][]) {
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
    }
    return view;
  }

  async setCurrentViewKey(new_view_key: string) {
    const exist = this.workspaceViews.find((v) => v.key === new_view_key);
    this.currentViewKey = exist ? exist.key : null;
    this.assetsContent.flushRecentlyAddedIds();
    await this._loadAssetsContent(false);
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
    assert(this.workspaceId);
    const workspace = await this.appManager
      .get(CreatorAssetManager)
      .getWorkspaceById(this.workspaceId);
    assert(workspace);

    const new_workspace_props = { ...workspace.props };

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

    await this.appManager
      .get(CreatorAssetManager)
      .changeWorkspace(this.workspaceId, {
        props: change_res.props,
      });
    this.views = { ...views_map };
  }

  async saveCurrentView() {
    const current_key = this.currentView.key;
    const new_user_views = {
      ...((this.views as { [key: string]: UserView }) ?? {}),
    };
    new_user_views[current_key] = this.modifiedCurrentView;

    await this.saveWorkspaceViews(new_user_views);

    if (this._unsavedViewData.hasOwnProperty(current_key)) {
      delete this._unsavedViewData[current_key];
    }
  }
}
