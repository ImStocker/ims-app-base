import { debounceForThis } from '../../../components/utils/ComponentUtils';
import CreatorAssetManager from '../../managers/CreatorAssetManager';
import type { IAppManager } from '../../managers/IAppManager';
import UiManager, {
  type UiNavigationGuardHandler,
} from '../../managers/UiManager';
import type { SubscriberHandler } from '../../types/Subscriber';
import type { AssetChangeDTO } from '../../types/AssetsType';
import {
  castAssetPropValueToString,
  type AssetProps,
  type AssetPropValueAsset,
  type AssetPropValueSelection,
} from '../../types/Props';
import type { AssetPropsSelection } from '../../types/PropsSelection';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
} from '../../types/PropsWhere';
import { generateNextUniqueNameNumber } from '../../utils/stringUtils';
import { assert } from '../../utils/typeUtils';
import type { WorkspaceChanger } from './WorkspaceChanger';
import type {
  UserViewProp,
  UserViewSort,
} from '../../../components/Workspace/ViewOptions/viewUtils';

export type WorkspaceContentControllerChangeItem = {
  assetId: string;
  changes: AssetProps[];
};

export type WorkspaceContentParams = {
  searchQuery?: AssetPropWhere;
};

export class WorkspaceContentController {
  items = [] as AssetProps[];
  total = 0;
  isLoading = false;
  loadingError = null as null | string;
  reloadDelayed: (reset?: boolean) => void;
  reloadRequested = null as null | {
    reset: boolean;
    promise: Promise<void>;
    run: () => Promise<void>;
  };

  private _loadedQuery: AssetPropsSelection | null = null;

  private _sort: UserViewSort[] = [];
  private _props: UserViewProp[] = [];
  private _filter: AssetPropValueSelection | null = null;
  changer: WorkspaceChanger;
  appManager: IAppManager;
  workspaceId: string | null;
  addBusy: boolean = false;
  savingBusy: boolean = false;
  assetEventsSubscriber: SubscriberHandler | null = null;
  dirtyChanges = new Map<
    string,
    { changes: AssetProps[]; props: Set<string> }
  >();
  private _recentlyAddedItemIds = new Map<string, number>();
  private _navigationGuardHandler: UiNavigationGuardHandler | null = null;

  setSort(sort: UserViewSort[]) {
    this._sort = sort;
  }

  setProps(props: UserViewProp[]) {
    this._props = props;
  }

  setFilter(filter: AssetPropValueSelection | null) {
    this._filter = filter;
  }

  constructor(
    appManager: IAppManager,
    changer: WorkspaceChanger,
    params: WorkspaceContentParams,
  ) {
    this.appManager = appManager;
    this.workspaceId = this.getWorkspaceId(params.searchQuery);
    this.changer = changer;
    this.reloadDelayed = debounceForThis(function (this: any, reset = false) {
      this.reload(reset);
    }, 100);
  }

  getWorkspaceId(where?: AssetPropWhere): string | null {
    if (where) {
      for (const field of ['workspaceid', 'workspaceids']) {
        if (typeof where[field] === 'string') {
          return where[field];
        } else if (
          Array.isArray(where[field]) &&
          where[field].length === 1 &&
          typeof where[field][0] === 'string'
        ) {
          return where[field][0];
        }
      }
    }
    return null;
  }

  get hasItemRecentlyAdded() {
    return this._recentlyAddedItemIds.size > 0;
  }

  isItemRecentlyAdded(id: string) {
    return this._recentlyAddedItemIds.has(id);
  }

  flushRecentlyAddedIds() {
    this._recentlyAddedItemIds = new Map();
  }

  get sortedItems(): AssetProps[] {
    if (this._recentlyAddedItemIds.size === 0) {
      return this.items;
    }
    const res = [...this.items];
    res.sort((a, b) => {
      const a_added_index = this._recentlyAddedItemIds.get(a.id as string);
      const b_added_index = this._recentlyAddedItemIds.get(b.id as string);
      if (a_added_index === undefined) {
        if (b_added_index === undefined) return 0;
        else return -1;
      } else if (b_added_index === undefined) {
        return 1;
      } else return a_added_index - b_added_index;
    });

    return res;
  }

  async getBaseAssetId(): Promise<string | null> {
    if (!this.workspaceId) return null;
    const workspace = await this.appManager
      .get(CreatorAssetManager)
      .getWorkspaceById(this.workspaceId);
    if (!workspace) return null;
    if (!workspace.props.asset) return null;
    return (workspace.props.asset as AssetPropValueAsset).AssetId ?? null;
  }

  private _resetNavigationGuard() {
    if (!this._navigationGuardHandler) return;
    this._navigationGuardHandler.cancel();
    this._navigationGuardHandler = null;
  }

  private _initNavigationGuard() {
    if (this._navigationGuardHandler) return;
    this._navigationGuardHandler = this.appManager
      .get(UiManager)
      .setNavigationGuard(
        () => this.dirtyChanges.size === 0,
        async () => {
          await this.saveDirtyChanges();
          return true;
        },
      );
  }

  async init() {
    this.assetEventsSubscriber = this.appManager
      .get(CreatorAssetManager)
      .assetEvents.subscribe(async (change_res) => {
        const base_asset_id = await this.getBaseAssetId();
        const listen_asset_ids = new Set(this.items.map((item) => item.id));
        if (base_asset_id) {
          listen_asset_ids.add(base_asset_id);
        }
        const need_reload =
          change_res.deletedIds.some((id) => listen_asset_ids.has(id)) ||
          change_res.upsert.ids.some((id) => listen_asset_ids.has(id));

        if (need_reload) {
          await this.reload(false, true);
        }
      });
    this._initNavigationGuard();
  }

  async destroy() {
    if (this.assetEventsSubscriber) {
      this.assetEventsSubscriber.unsubscribe();
      this.assetEventsSubscriber = null;
    }
    this._resetNavigationGuard();
  }

  async reload(reset: boolean, reload_same_query = false): Promise<void> {
    if (this.isLoading) {
      if (this.reloadRequested) {
        this.reloadRequested.reset = this.reloadRequested.reset || reset;
      } else {
        let resolve: () => void;
        let reject: (err: Error) => void;

        this.reloadRequested = {
          promise: new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
          }),
          reset: reset,
          run: async () => {
            const params = this.reloadRequested;
            assert(params);
            this.reloadRequested = null;
            try {
              await this.reload(params.reset);
              resolve();
            } catch (err: any) {
              reject(err);
            }
          },
        };
      }

      assert(this.reloadRequested);
      return await this.reloadRequested.promise;
    }

    let filtering: AssetPropWhere;
    const thisWorkspaceId = this.workspaceId ?? null;

    if (
      this._filter &&
      this._filter.Where &&
      this._recentlyAddedItemIds.size != 0
    ) {
      filtering = {
        'filter-or-recently-added': {
          op: AssetPropWhereOpKind.OR,
          v: [
            {
              id: {
                op: AssetPropWhereOpKind.ANY,
                v: [...this._recentlyAddedItemIds.keys()],
              },
            },
            this._filter.Where,
          ],
        },
        workspaceId: thisWorkspaceId,
      };
    } else {
      filtering = {
        ...(this._filter ? this._filter.Where : {}),
        workspaceId: thisWorkspaceId,
      };
    }

    const query: AssetPropsSelection = {
      select: [
        'id',
        'rights',
        'icon',
        'index',
        ...this._props.map((c) => {
          return c.prop;
        }),
      ],
      where: filtering,
      order: this._sort.map((s) => {
        return {
          prop: s.prop,
          desc: !!s.desc,
        };
      }),
    };

    if (reset) {
      this.items = [];
      this.total = 0;
    } else if (this._loadedQuery) {
      if (
        JSON.stringify(this._loadedQuery) === JSON.stringify(query) &&
        !reload_same_query
      ) {
        return;
      }
    }
    this.loadingError = null;
    this.isLoading = true;
    try {
      const data = await this.appManager
        .get(CreatorAssetManager)
        .getAssetsView(query);
      this.items = data.list;
      this.total = data.total;
      this._loadedQuery = query;
    } catch (err: any) {
      this.loadingError = err.message;
    } finally {
      this.isLoading = false;
    }

    if (this.reloadRequested) {
      this.reloadRequested.run(); // NOTE: no await
    }
  }

  async addItem() {
    await this.saveDirtyChanges();
    await this.changer.executeHistoryTask(async (add_data) => {
      this.addBusy = true;
      try {
        assert(this.workspaceId);
        const base_asset_id = await this.getBaseAssetId();
        assert(base_asset_id);
        const exists_titles = new Set(
          this.items.map((item) => castAssetPropValueToString(item['title'])),
        );
        const res = await this.appManager.get(CreatorAssetManager).createAsset({
          id: add_data.assetId ? add_data.assetId : undefined,
          set: {
            title: generateNextUniqueNameNumber(
              'Untitled',
              (val) => {
                return !exists_titles.has(val);
              },
              ' - ',
            ),
            workspaceId: this.workspaceId,
            parentIds: [base_asset_id],
          },
        });
        const added_id = res.ids[0];
        add_data.assetId = added_id;
        this._recentlyAddedItemIds.set(
          added_id,
          [...this._recentlyAddedItemIds.values()].reduce((acc, val) => {
            return acc > val ? acc : val;
          }, 0) + 1,
        );
        await this.reload(false, true);
        return async () => {
          this.savingBusy = true;
          try {
            if (res.changeId) {
              await this.appManager.get(CreatorAssetManager).changeAssetsUndo({
                changeId: res.changeId,
              });
              const asset_index = this.items.findIndex(
                (item) => item.id === added_id,
              );
              if (asset_index >= 0) {
                this.items.splice(asset_index, 1);
              }
              this._recentlyAddedItemIds.delete(added_id);
            }
          } finally {
            this.savingBusy = false;
          }
        };
      } finally {
        this.addBusy = false;
      }
    });
  }

  async deleteItemsByIds(deleting_asset_ids: string[]) {
    await this.saveDirtyChanges();
    await this.changer.executeHistoryTask(async () => {
      this.savingBusy = true;
      try {
        const delete_res = await this.appManager
          .get(CreatorAssetManager)
          .deleteAssets({
            where: {
              id: deleting_asset_ids,
            },
          });
        for (const deleted_id of delete_res.ids) {
          this.dirtyChanges.delete(deleted_id);
        }
        this.savingBusy = false;

        return async () => {
          this.savingBusy = true;
          try {
            if (delete_res.changeId) {
              await this.appManager.get(CreatorAssetManager).changeAssetsUndo({
                changeId: delete_res.changeId,
              });
              this.savingBusy = false;
              await this.reload(false, true);
            }
          } finally {
            this.savingBusy = false;
          }
        };
      } finally {
        this.savingBusy = false;
      }
    });
  }

  async saveDirtyChanges() {
    if (this.dirtyChanges.size === 0) {
      return;
    }
    const save_assets = new Map<string, AssetChangeDTO>();
    for (const [assetId, dirty_content] of this.dirtyChanges) {
      // actual changes
      let save_asset = save_assets.get(assetId);
      if (!save_asset) {
        save_asset = {
          set: {},
          where: {
            id: assetId,
          },
        };
        save_assets.set(assetId, save_asset);
      }

      for (const change_op of dirty_content.changes) {
        for (const [op_key, op_value] of Object.entries(change_op)) {
          const parsed_op_key = op_key.match(/^((~)?(.*?)\|)?(.*)$/);
          assert(parsed_op_key);
          const block_ref = parsed_op_key[3];
          const key_delete = parsed_op_key[2] ?? '';
          const prop_key = parsed_op_key[4];
          if (block_ref) {
            let save_asset_block =
              save_asset.set.blocks &&
              save_asset.set.blocks.hasOwnProperty(block_ref)
                ? save_asset.set.blocks[block_ref]
                : null;
            if (!save_asset_block) {
              save_asset_block = { props: {} };
              save_asset.set.blocks = {
                ...(save_asset.set.blocks ?? {}),
                [block_ref]: save_asset_block,
              };
            }
            if (!save_asset_block.props) save_asset_block.props = {};
            save_asset_block.props[key_delete + prop_key] = op_value;
          } else {
            if (key_delete) save_asset.set[prop_key] = null;
            else save_asset.set[prop_key] = op_value;
          }
        }
      }
    }

    await this.changer.executeHistoryTask(async () => {
      this.savingBusy = true;
      try {
        const change_res = await this.appManager
          .get(CreatorAssetManager)
          .changeAssetsBatch({
            ops: [...save_assets.values()],
          });
        for (const saved_id of change_res.ids) {
          this.dirtyChanges.delete(saved_id);
        }

        return async () => {
          this.savingBusy = true;
          try {
            if (change_res.changeId) {
              await this.appManager.get(CreatorAssetManager).changeAssetsUndo({
                changeId: change_res.changeId,
              });
            }
          } finally {
            this.savingBusy = false;
          }
        };
      } finally {
        this.savingBusy = false;
      }
    });
  }

  isItemPropDirty(item_id: string, prop: string) {
    const dirty_change = this.dirtyChanges.get(item_id);
    return dirty_change && dirty_change.props.has(prop);
  }

  async changeItems(changes: WorkspaceContentControllerChangeItem[]) {
    if (changes.length === 0) {
      return;
    }
    for (const change of changes) {
      // dirty changes
      let dirty_change = this.dirtyChanges.get(change.assetId);
      if (!dirty_change) {
        dirty_change = {
          changes: [],
          props: new Set(),
        };
        this.dirtyChanges.set(change.assetId, dirty_change);
      }

      dirty_change.changes = [...dirty_change.changes, ...change.changes];
      for (const ch of change.changes) {
        for (const prop of Object.keys(ch)) {
          dirty_change.props.add(prop);
        }
      }
    }
  }

  toJSON(): Record<string, any> {
    return {
      items: this.items,
      total: this.total,
      isLoading: this.isLoading,
      loadingError: this.loadingError,
      sort: this._sort,
      props: this._props,
      filter: this._filter,
      workspaceId: this.workspaceId,
    };
  }

  loadJSON(data: Record<string, any>): void {
    this.items = data.items;
    this.total = data.total;
    this.isLoading = data.isLoading;
    this.loadingError = data.loadingError;
    this._sort = data.sort;
    this._props = data.props;
    this._filter = data.filter;
    this.workspaceId = data.workspaceId;
  }
}
