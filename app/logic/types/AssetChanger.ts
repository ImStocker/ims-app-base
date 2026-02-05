import { assert } from '../utils/typeUtils';
import { AssetChangeBatch } from './AssetChangeBatch';
import type {
  AssetBlockParamsDTO,
  AssetChangeContent,
  AssetForEdit,
  AssetPropsParamsDTO,
  AssetSetDTO,
} from './AssetsType';

import type { AssetBlockEntity } from './BlocksType';
import {
  makeDeletePropKeys,
  makeRenamePropKey,
  makeRenamePropKeys,
} from './makePropsChange';
import {
  applyPropsChange,
  mergeInheritedProps,
  parseAssetNewBlockRef,
  recalculatePropsArrayIndexes,
  type AssetProps,
  type AssetPropValue,
} from './Props';
import { v4 as uuidv4 } from 'uuid';

type HistoryAction = AssetChangeContent | (() => any);

type HistoryRecord = {
  opId: number;
  assetId: string | null;
  blockRef: string | null;
  blockAnchor: string | null;
  redo: HistoryAction;
  undo: HistoryAction | null; // Will be set during saving
};

type UndoRedoResult = {
  success: boolean;
  blockRef: string | null;
  blockAnchor: string | null;
};

export type HistorySaveRequest = {
  assetId: string;
  changes: AssetChangeContent[];
};

export type HistorySaveResponse = {
  originals: AssetForEdit[];
};

export type AssetChangerChangeMainParams = Omit<
  AssetSetDTO,
  'blocks' | 'creatorUserId'
>;

export type AssetChangerChangeBlockParams = Omit<
  AssetBlockParamsDTO,
  'props' | 'type'
>;

export type BlockCursor = {
  blockRef: string;
  blockKey: string;
  offset: number;
};

export class AssetChanger {
  private _history: HistoryRecord[] = [];
  private _historyPointer = 0;
  private _savePointer = 0;
  private _opIdGenerator = 0;
  private _cutUndoForSaved: HistoryRecord[] = [];
  private _newBlockDateIso = new Date().toISOString();
  private _lastSavingJob: Promise<void> = Promise.resolve();
  private _lastUndoRedoJob: Promise<UndoRedoResult> =
    Promise.resolve<UndoRedoResult>({
      blockAnchor: null,
      blockRef: null,
      success: false,
    });
  private _isSaving = false;
  private _isUndoRedoBusy: false | 'undo' | 'redo' = false;

  private _saveChangesImpl: (
    request: HistorySaveRequest[],
  ) => Promise<HistorySaveResponse>;

  constructor(
    saveChangesImpl: (
      request: HistorySaveRequest[],
    ) => Promise<HistorySaveResponse>,
  ) {
    this._saveChangesImpl = saveChangesImpl;
  }

  discard() {
    if (this._cutUndoForSaved.length > 0) {
      this._history = [
        ...this._history.slice(0, this._savePointer),
        ...this._cutUndoForSaved,
      ];
      this._cutUndoForSaved = [];
      this._savePointer = this._history.length;
    }
    this._historyPointer = this._savePointer;
  }

  get isSaving() {
    return this._isSaving;
  }

  get isUndoRedoBusy() {
    return this._isUndoRedoBusy;
  }

  makeOpId() {
    return ++this._opIdGenerator;
  }

  cutHistory() {
    if (this._historyPointer >= this._history.length) {
      return;
    }
    if (this._savePointer > this._historyPointer) {
      this._cutUndoForSaved = [
        ...this._history.slice(this._historyPointer, this._savePointer),
        ...this._cutUndoForSaved,
      ];
      this._savePointer = this._historyPointer;
    }
    this._history = this._history.slice(0, this._historyPointer);
  }

  registerChange(
    assetId: string,
    change: AssetChangeContent,
    opId?: number,
  ): void;
  registerChange(
    assetId: string,
    change: AssetChangeContent,
    blockRef: string,
    blockAnchor?: string | null,
    opId?: number,
  ): void;

  registerChange(
    assetId: string,
    change: AssetChangeContent,
    blockRefOrOp?: string | number,
    blockAnchor?: string | null,
    opId?: number,
  ) {
    let blockRef: string | null;
    if (typeof blockRefOrOp === 'number') {
      opId = blockRefOrOp;
      blockRef = null;
    } else {
      blockRef = blockRefOrOp ?? null;
    }
    if (!opId) opId = this.makeOpId();
    this.cutHistory();
    this._history.push({
      assetId,
      opId,
      blockRef,
      blockAnchor: blockAnchor ?? null,
      redo: change,
      undo: null,
    });
    this._historyPointer = this._history.length;
  }

  changeMainParams(
    assetId: string,
    change: AssetChangerChangeMainParams,
    opId?: number,
  ) {
    this.registerChange(assetId, change, opId);
  }

  createBlock(
    assetId: string,
    params: AssetBlockParamsDTO,
    opId?: number,
  ): { blockId: string } {
    if (!params.type) throw new Error('Type is not set for new block');
    const blockId = uuidv4();
    const blockRef = `@${blockId}`;
    this.registerChange(
      assetId,
      {
        blocks: {
          [blockRef]: params,
        },
      },
      blockRef,
      null,
      opId,
    );
    return {
      blockId,
    };
  }

  deleteBlock(assetId: string, blockRef: string, opId?: number) {
    this.registerChange(
      assetId,
      {
        blocks: {
          [blockRef]: {
            delete: true,
          },
        },
      },
      blockRef,
      null,
      opId,
    );
  }

  resetBlock(assetId: string, blockRef: string, opId?: number) {
    this.registerChange(
      assetId,
      {
        blocks: {
          [blockRef]: {
            reset: true,
          },
        },
      },
      blockRef,
      null,
      opId,
    );
  }

  changeBlockParams(
    assetId: string,
    blockRef: string,
    change: AssetChangerChangeBlockParams,
    opId?: number,
  ) {
    this.registerChange(
      assetId,
      {
        blocks: {
          [blockRef]: change,
        },
      },
      blockRef,
      null,
      opId,
    );
  }

  registerBlockPropsChanges(
    assetId: string,
    blockRef: string,
    blockAnchor: string | null,
    changes: AssetProps[],
    opId?: number,
  ) {
    if (!opId && changes.length > 1) {
      opId = this.makeOpId();
    }
    for (const change of changes) {
      this.registerChange(
        assetId,
        {
          blocks: {
            [blockRef]: {
              props: change,
            },
          },
        },
        blockRef,
        blockAnchor,
        opId,
      );
    }
  }

  setBlockPropKeys(
    assetId: string,
    blockRef: string,
    blockAnchor: string | null,
    props: AssetProps,
    opId?: number,
  ) {
    this.registerChange(
      assetId,
      {
        blocks: {
          [blockRef]: {
            props,
          },
        },
      },
      blockRef,
      blockAnchor,
      opId,
    );
  }

  setBlockPropKey(
    assetId: string,
    blockRef: string,
    blockAnchor: string | null,
    propKey: string,
    value: AssetPropValue,
    opId?: number,
  ) {
    this.setBlockPropKeys(
      assetId,
      blockRef,
      blockAnchor,
      {
        [propKey]: value,
      },
      opId,
    );
  }

  deleteBlockPropKey(
    assetId: string,
    blockRef: string,
    blockAnchor: string | null,
    propKey: string,
    opId?: number,
  ) {
    this.deleteBlockPropKeys(assetId, blockRef, blockAnchor, [propKey], opId);
  }

  deleteBlockPropKeys(
    assetId: string,
    blockRef: string,
    blockAnchor: string | null,
    propKeys: string[],
    opId?: number,
  ) {
    this.registerChange(
      assetId,
      {
        blocks: {
          [blockRef]: {
            props: makeDeletePropKeys(propKeys),
          },
        },
      },
      blockRef,
      blockAnchor,
      opId,
    );
  }

  renameBlockPropKey(
    assetId: string,
    blockRef: string,
    blockAnchor: string | null,
    oldPropKey: string,
    newPropKey: string,
    opId?: number,
  ) {
    this.registerChange(
      assetId,
      {
        blocks: {
          [blockRef]: {
            props: makeRenamePropKey(oldPropKey, newPropKey),
          },
        },
      },
      blockRef,
      blockAnchor,
      opId,
    );
  }

  renameBlockPropKeys(
    assetId: string,
    blockRef: string,
    blockAnchor: string | null,
    renameMap: { [oldkey: string]: string },
    opId?: number,
  ) {
    this.registerChange(
      assetId,
      {
        blocks: {
          [blockRef]: {
            props: makeRenamePropKeys(renameMap),
          },
        },
      },
      blockRef,
      blockAnchor,
      opId,
    );
  }

  async executeTask(task: () => Promise<() => Promise<any>>, opId?: number) {
    if (!opId) opId = this.makeOpId();
    const record: HistoryRecord = {
      assetId: null,
      opId,
      blockRef: null,
      blockAnchor: null,
      redo: async () => {
        const job = this._lastSavingJob.then(async () => {
          const undo = await task();
          record.undo = async () => {
            const job = this._lastSavingJob.then(async () => {
              await undo();
            });
            this._lastSavingJob = job.then(null, (_err) => {});
            await job;
          };
        });
        this._lastSavingJob = job.then(null, (_err) => {});
        await job;
      },
      undo: null,
    };
    assert(typeof record.redo === 'function');
    await this.saveChanges();
    await record.redo();
    this.cutHistory();
    this._history.push(record);
    this._historyPointer = this._history.length;
    this._savePointer = this._historyPointer;
  }

  get canUndo() {
    return this._historyPointer > 0;
  }

  get canRedo() {
    return this._historyPointer < this._history.length;
  }

  async undo(): Promise<UndoRedoResult> {
    if (!this.canUndo) {
      return {
        success: false,
        blockRef: null,
        blockAnchor: null,
      };
    }
    const execute_undo_task = async (new_p: number) => {
      const task = this._history[new_p].undo;
      assert(task && typeof task === 'function');
      this._historyPointer = new_p + 1;
      await this.saveChanges();
      this._historyPointer = new_p;
      await task();
      this._savePointer = new_p;
    };

    const job = this._lastUndoRedoJob.then(async () => {
      this._isUndoRedoBusy = 'undo';
      try {
        let new_p = this._historyPointer - 1;
        if (typeof this._history[new_p].undo === 'function') {
          await execute_undo_task(new_p);
        }
        const undo_op = this._history[new_p].opId;
        while (new_p > 0 && this._history[new_p - 1].opId === undo_op) {
          new_p--;
          if (typeof this._history[new_p].undo === 'function') {
            await execute_undo_task(new_p);
          }
        }
        this._historyPointer = new_p;
        return {
          success: true,
          blockRef: this._history[new_p].blockRef,
          blockAnchor: this._history[new_p].blockAnchor,
        };
      } finally {
        this._isUndoRedoBusy = false;
      }
    });
    this._lastUndoRedoJob = job.then(null, (_err) => {
      return { blockAnchor: null, blockRef: null, success: false };
    });
    return await job;
  }

  async redo(): Promise<UndoRedoResult> {
    if (!this.canRedo) {
      return {
        success: false,
        blockRef: null,
        blockAnchor: null,
      };
    }
    const execute_redo_task = async (new_p: number) => {
      const task = this._history[new_p].redo;
      assert(task && typeof task === 'function');
      this._historyPointer = new_p;
      await this.saveChanges();
      this._historyPointer = new_p + 1;
      await task();
      this._savePointer = new_p + 1;
    };

    const job = this._lastUndoRedoJob.then(async () => {
      this._isUndoRedoBusy = 'redo';
      try {
        let new_p = this._historyPointer + 1;
        if (typeof this._history[new_p - 1].redo === 'function') {
          await execute_redo_task(new_p - 1);
        }
        const redo_op = this._history[new_p - 1].opId;
        while (
          new_p < this._history.length &&
          this._history[new_p].opId === redo_op
        ) {
          new_p++;
          if (typeof this._history[new_p - 1].redo === 'function') {
            await execute_redo_task(new_p - 1);
          }
        }
        this._historyPointer = new_p;
        return {
          success: true,
          blockRef: this._history[new_p - 1].blockRef,
          blockAnchor: this._history[new_p - 1].blockAnchor,
        };
      } finally {
        this._isUndoRedoBusy = false;
      }
    });
    this._lastUndoRedoJob = job.then(null, (_err) => {
      return { blockAnchor: null, blockRef: null, success: false };
    });
    return await job;
  }

  private get _hasChangesInHistory() {
    return (
      this._historyPointer !== this._savePointer ||
      this._cutUndoForSaved.length > 0
    );
  }

  public get hasChangesAny(): boolean {
    return this._hasChangesInHistory;
  }

  hasChanges(_asset: AssetForEdit): boolean {
    return this._hasChangesInHistory;
  }

  getOptimizedSaveBatch(assetId: string): AssetChangeContent[] {
    const batches = this._getBatchedChanges();
    const batch = batches.get(assetId);
    if (!batch) return [];
    return batch.getBatch();
  }

  private _updateComputedBlockProps(exists_block: AssetBlockEntity) {
    exists_block.computed = mergeInheritedProps(
      exists_block.inherited ?? {},
      exists_block.props,
    );
    recalculatePropsArrayIndexes(exists_block.computed);
  }

  private _applyChangesBlockProps(
    exists_block: AssetBlockEntity,
    props_change_batch: AssetPropsParamsDTO[],
  ): { undo: AssetProps[] } {
    const change_result = applyPropsChange(
      exists_block ? exists_block.props : {},
      exists_block.inherited ?? {},
      props_change_batch,
    );

    exists_block.props = change_result.props;
    this._updateComputedBlockProps(exists_block);
    return {
      undo: change_result.undo,
    };
  }

  private _applyChangesBatch(
    resultAsset: AssetForEdit,
    changes: AssetChangeContent[],
    undoRecords?: HistoryRecord[],
  ) {
    if (changes.length === 0) return;

    assert(
      !undoRecords || undoRecords.length === changes.length,
      'Undo records do not match changes length',
    );

    const blocks_map = new Map<string, AssetBlockEntity>();
    for (const block of resultAsset.blocks) {
      blocks_map.set(block.id, block);
    }

    for (let c = 0; c < changes.length; c++) {
      const ch = changes[c];
      let undo_rec: AssetChangeContent | undefined = undefined;
      if (undoRecords) {
        undo_rec = {};
        undoRecords[c].undo = undo_rec;
      }
      if (ch.title !== undefined) {
        if (undo_rec) {
          undo_rec.title = resultAsset.ownTitle;
        }
        resultAsset.title = ch.title;
        resultAsset.ownTitle = ch.title;
      }
      if (ch.icon !== undefined) {
        if (undo_rec) {
          undo_rec.icon = resultAsset.ownIcon;
        }
        resultAsset.icon = ch.icon;
        resultAsset.ownIcon = ch.icon;
      }
      for (const key of [
        'index',
        'isAbstract',
        'name',
        'parentIds',
        'workspaceId',
      ] as (keyof AssetChangerChangeMainParams)[]) {
        if (ch[key] !== undefined) {
          if (undo_rec) {
            undo_rec[key] = (resultAsset as any)[key];
          }
          (resultAsset as any)[key] = ch[key] as any;
        }
      }
      if (ch.blocks !== undefined) {
        for (const [block_ref, block_ch] of Object.entries(ch.blocks)) {
          const parsed_block_ref = parseAssetNewBlockRef(block_ref);
          let exists_block: AssetBlockEntity | undefined;
          if (parsed_block_ref.blockId) {
            exists_block = blocks_map.get(parsed_block_ref.blockId);
          } else {
            exists_block = resultAsset.blocks.find(
              (b) => b.name === parsed_block_ref.blockName,
            );
          }

          let was_new = false;
          let undo_rec_block: AssetBlockParamsDTO | undefined;
          if (undo_rec) {
            if (!undo_rec.blocks) undo_rec.blocks = {};
            undo_rec_block = {};
            if (block_ch.delete && exists_block) {
              undo_rec.blocks[`@${exists_block.id}`] = undo_rec_block;
            } else {
              undo_rec.blocks[block_ref] = undo_rec_block;
            }
          }

          if (!exists_block) {
            if (block_ch.delete) continue;
            assert(block_ch.type, 'New block has no type');

            const block_id = parsed_block_ref.blockId;
            assert(block_id, 'Block changed by name. Its id is not found');
            exists_block = {
              id: block_id,
              computed: {},
              createdAt: this._newBlockDateIso,
              inherited: null,
              props: {},
              own: true,
              ownTitle: block_ch.title !== undefined ? block_ch.title : null,
              updatedAt: this._newBlockDateIso,
              index: block_ch.index !== undefined ? block_ch.index : 0,
              name: block_ch.name !== undefined ? block_ch.name : null,
              title: block_ch.title !== undefined ? block_ch.title : null,
              type: block_ch.type,
            };
            blocks_map.set(block_id, exists_block);
            resultAsset.blocks.push(exists_block);
            was_new = true;
            if (undo_rec_block) {
              undo_rec_block.delete = true;
            }
          } else {
            if (block_ch.delete) {
              const block_ind = resultAsset.blocks.findIndex(
                (b) =>
                  (parsed_block_ref.blockId &&
                    b.id === parsed_block_ref.blockId) ||
                  (parsed_block_ref.blockName &&
                    b.name === parsed_block_ref.blockName),
              );
              if (block_ind >= 0) resultAsset.blocks.splice(block_ind, 1);
              blocks_map.delete(exists_block.id);
              if (undo_rec_block) {
                undo_rec_block.type = exists_block.type;
                undo_rec_block.index = exists_block.index;
                undo_rec_block.name = exists_block.name;
                undo_rec_block.title = exists_block.title;
                undo_rec_block.props = exists_block.props;
              }
              continue;
            } else if (block_ch.reset) {
              if (undo_rec_block) {
                undo_rec_block.type = exists_block.type;
                undo_rec_block.index = exists_block.index;
                undo_rec_block.name = exists_block.name;
                undo_rec_block.title = exists_block.title;
                undo_rec_block.props = exists_block.props;
              }
              exists_block.props = {};
              this._updateComputedBlockProps(exists_block);
              exists_block.own = false;
            }
            for (const key of [
              'index',
              'name',
              'title',
            ] as (keyof AssetChangerChangeBlockParams)[]) {
              if (block_ch[key] !== undefined) {
                if (undo_rec_block && !block_ch.reset) {
                  undo_rec_block[key] = (exists_block as any)[key];
                }
                (exists_block as any)[key] = block_ch[key] as any;
                exists_block.own = true;
              }
            }
          }

          if (block_ch.props) {
            const block_ch_list = Array.isArray(block_ch.props)
              ? block_ch.props
              : [block_ch.props];
            const applied_props = this._applyChangesBlockProps(
              exists_block,
              block_ch_list,
            );
            exists_block.own = true;
            if (undo_rec_block && !was_new && !block_ch.reset) {
              undo_rec_block.props = applied_props.undo;
            }
          }
        }
      }
    }
  }

  // Optimize changes and group them by assetId
  private _getBatchedChanges(
    forAssetId?: string,
  ): Map<string, AssetChangeBatch> {
    const batches = new Map<string, AssetChangeBatch>();

    const add_change = (assetId: string, change: AssetChangeContent) => {
      let batch = batches.get(assetId);
      if (!batch) {
        batch = new AssetChangeBatch();
        batches.set(assetId, batch);
      }
      batch.addChange(change);
    };

    for (const change of [...this._cutUndoForSaved].reverse()) {
      if (!change.assetId) continue;
      if (forAssetId && change.assetId !== forAssetId) {
        continue;
      }
      assert(change.undo);
      assert(typeof change.undo !== 'function');
      add_change(change.assetId, change.undo);
    }

    let changes: HistoryRecord[];
    const need_redo = this._savePointer < this._historyPointer;
    if (need_redo) {
      changes = this._history.slice(this._savePointer, this._historyPointer);
    } else {
      changes = [
        ...this._history.slice(this._historyPointer, this._savePointer),
      ].reverse();
    }
    for (const change of changes) {
      if (!change.assetId) continue;
      if (forAssetId && change.assetId !== forAssetId) {
        continue;
      }
      const action = change[need_redo ? 'redo' : 'undo'];
      assert(action);
      assert(typeof action !== 'function');
      add_change(change.assetId, action);
    }

    return batches;
  }

  applyChanges(asset: AssetForEdit): AssetForEdit {
    if (!this._hasChangesInHistory) {
      return asset;
    }

    const batches = this._getBatchedChanges(asset.id);
    const batch = batches.get(asset.id);
    if (!batch) {
      return asset;
    }

    const result: AssetForEdit = {
      ...asset,
      blocks: asset.blocks.map((block) => {
        return {
          ...block,
          props: {
            ...block.props,
          },
        };
      }),
    };

    this._applyChangesBatch(result, batch.getBatch());

    return result;
  }

  async saveChanges(): Promise<boolean> {
    if (!this._hasChangesInHistory) {
      return false;
    }

    const job = this._lastSavingJob.then(async () => {
      const batches = this._getBatchedChanges();
      if (batches.size === 0) return false;

      const history_old = [...this._history];
      const save_pointer_old = this._savePointer;
      const history_pointer_old = this._historyPointer;

      try {
        this._isSaving = true;
        const request = [...batches.entries()].map(([assetId, batch]) => ({
          assetId,
          changes: batch.getBatch(),
        }));

        const response = await this._saveChangesImpl(request);

        // Формируем undo
        if (history_pointer_old > save_pointer_old) {
          const history_to_undo = history_old.slice(
            save_pointer_old,
            history_pointer_old,
          );
          for (const original of response.originals) {
            this._applyChangesBatch(
              original,
              history_to_undo.map((x) => {
                assert(typeof x.redo !== 'function');
                return x.redo;
              }),
              history_to_undo,
            );
          }
        }

        // Если история после обновления не совпадает - ищем начало разрыва
        let common_i = -1;
        while (
          common_i < history_old.length - 1 &&
          common_i < this._history.length - 1 &&
          history_old[common_i + 1].opId === this._history[common_i + 1].opId
        ) {
          common_i++;
        }
        this._cutUndoForSaved = history_old.slice(
          common_i + 1,
          history_pointer_old,
        );
        this._savePointer = Math.min(common_i + 1, history_pointer_old);
      } finally {
        this._isSaving = false;
      }

      return true;
    });
    this._lastSavingJob = job.then(null, (_err) => {});
    return job;
  }
}
