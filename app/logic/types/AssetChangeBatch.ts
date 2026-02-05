import type { AssetChangerChangeMainParams } from './AssetChanger';
import type { AssetBlockParamsDTO, AssetChangeContent } from './AssetsType';
import type { AssetProps, AssetPropValue } from './Props';

type AssetChangeBatchPropsOp = {
  overlay: AssetProps;
  deletedPropNames: Set<string>;
  restoringPropNames: Set<string>;
  originalPropNames: Map<string, string>;
  renamedToPropNames: Set<string>;
};

class AssetChangeBatchBlockState {
  propOps: AssetChangeBatchPropsOp[] = [];
  mainParams: AssetBlockParamsDTO = {};

  private _getOp(force_new?: boolean): AssetChangeBatchPropsOp {
    if (this.propOps.length === 0 || force_new) {
      const op: AssetChangeBatchPropsOp = {
        overlay: {},
        deletedPropNames: new Set<string>(),
        restoringPropNames: new Set<string>(),
        originalPropNames: new Map<string, string>(),
        renamedToPropNames: new Set<string>(),
      };
      this.propOps.push(op);
      return op;
    }
    return this.propOps[this.propOps.length - 1];
  }

  private _setPropKeys(change_keys: AssetProps) {
    const op = this._getOp();
    Object.assign(op.overlay, change_keys);
  }

  private _deletePropKey(key: string, restore: boolean) {
    let op = this._getOp();

    const new_op = this._checkKeyWasRenamed(op, key);

    if (new_op) {
      op = this._getOp(true);
    }

    const original_name = op.originalPropNames.get(key);
    if (original_name !== undefined) {
      op.originalPropNames.delete(key);
      op.deletedPropNames.add(original_name);
      if (restore) {
        op.restoringPropNames.add(original_name);
      } else {
        op.restoringPropNames.delete(original_name);
      }
    } else {
      op.deletedPropNames.add(key);
      if (restore) {
        op.restoringPropNames.add(key);
      } else {
        op.restoringPropNames.delete(key);
      }
    }
    for (const [oldn, _oldv] of Object.entries(op.overlay)) {
      if (key === oldn || oldn.startsWith(key + '\\') || key === '') {
        delete op.overlay[oldn];
      }
    }
  }

  private _checkKeyWasRenamed(
    op: AssetChangeBatchPropsOp,
    key_to?: string,
    key_from?: string,
  ) {
    for (const [renamed_to, renamed_from] of op.originalPropNames) {
      if (
        (key_to !== undefined &&
          (renamed_to === key_to ||
            renamed_to + '\\' === key_to.substring(0, renamed_to.length + 1) ||
            key_to + '\\' === renamed_to.substring(0, key_to.length + 1))) ||
        (key_from !== undefined &&
          (renamed_from === key_from ||
            renamed_from + '\\' ===
              key_from.substring(0, renamed_from.length + 1) ||
            key_from + '\\' === renamed_from.substring(0, key_from.length + 1)))
      ) {
        return true;
      }
    }
    return false;
  }

  private _renamePropKey(oldkey: string, newkey: string) {
    if (oldkey == newkey) {
      return;
    }
    let op = this._getOp();

    let new_op = false;

    for (const deleted_key of op.deletedPropNames) {
      if (deleted_key === oldkey) {
        if (op.overlay.hasOwnProperty(oldkey)) {
          new_op = true;
        } else {
          return;
        }
      } else if (
        oldkey + '\\' ===
        deleted_key.substring(0, oldkey.length + 1)
      ) {
        new_op = true;
      }
    }

    if (!new_op) {
      new_op = this._checkKeyWasRenamed(op, oldkey, newkey);
    }

    if (new_op) {
      op = this._getOp(true);
    }

    const original_name = op.originalPropNames.get(oldkey);
    if (original_name !== undefined) {
      op.originalPropNames.delete(oldkey);
      if (newkey !== original_name) {
        op.originalPropNames.set(newkey, original_name);
      }
    } else {
      op.originalPropNames.set(newkey, oldkey);
    }
    for (const [oldn, oldv] of Object.entries(op.overlay)) {
      if (oldkey === oldn) {
        op.overlay[newkey] = oldv;
        delete op.overlay[oldn];
      } else if (oldn.startsWith(oldkey + '\\')) {
        op.overlay[newkey + oldn.substring(oldkey.length)] = oldv;
        delete op.overlay[oldn];
      }
    }
    op.renamedToPropNames.add(newkey);
  }

  feedPropsChange(change: AssetProps) {
    const deleting_props: string[] = [];
    const restoring_props: string[] = [];
    const renaming_props: [string, string][] = [];
    const overlay: { [key: string]: AssetPropValue } = {};

    for (const [prop, val] of Object.entries(change)) {
      if (prop[0] === '~') {
        const ch_prop = prop.substring(1);
        if (val === null) {
          deleting_props.push(ch_prop);
        } else if (val === true) {
          restoring_props.push(ch_prop);
        } else if (typeof val === 'string') {
          renaming_props.push([val, ch_prop]);
        } else {
          throw new Error(
            'Unexpected value for changing/deleting prop ' + prop,
          );
        }
      } else {
        overlay[prop] = val;
      }
    }

    for (const prop of deleting_props) {
      this._deletePropKey(prop, false);
    }
    for (const prop of restoring_props) {
      this._deletePropKey(prop, true);
    }
    for (const [newname, oldname] of renaming_props) {
      this._renamePropKey(oldname, newname);
    }
    this._setPropKeys(overlay);
  }

  private _getPropsChanges(): AssetProps[] {
    const res_batch: AssetProps[] = [];
    for (const op of this.propOps) {
      const res: AssetProps = {};
      for (const deleting_prop of op.deletedPropNames) {
        res[`~${deleting_prop}`] = op.restoringPropNames.has(deleting_prop)
          ? true
          : null;
      }
      for (const [newname, oldname] of op.originalPropNames) {
        res[`~${oldname}`] = newname;
      }
      Object.assign(res, op.overlay);
      res_batch.push(res);
    }
    return res_batch;
  }

  getGroupedChange(): AssetBlockParamsDTO {
    const res = {
      ...this.mainParams,
    };
    const prop_changes = this._getPropsChanges();
    if (prop_changes.length === 1) {
      res.props = prop_changes[0];
    } else if (prop_changes.length > 1) {
      res.props = prop_changes;
    }

    return res;
  }
}

class AssetChangeBatchAssetState {
  mainParams: AssetChangeContent = {};
  blockStates = new Map<string, AssetChangeBatchBlockState>();

  getGroupedChange(): AssetChangeContent {
    const res = { ...this.mainParams };
    if (this.blockStates.size > 0) {
      res.blocks = Object.fromEntries(
        [...this.blockStates.entries()].map(([block_ref, state]) => {
          return [block_ref, state.getGroupedChange()];
        }),
      );
    }
    return res;
  }
}

export class AssetChangeBatch {
  private assetChangeStates: AssetChangeBatchAssetState[] = [];

  addChange(change: AssetChangeContent) {
    if (this.assetChangeStates.length === 0) {
      this.assetChangeStates.push(new AssetChangeBatchAssetState());
    }
    let currentAssetState =
      this.assetChangeStates[this.assetChangeStates.length - 1];
    if (change.delete) {
      currentAssetState.mainParams.delete = true;
    } else if (change.restore) {
      if (currentAssetState.mainParams.delete) {
        this.assetChangeStates.push(new AssetChangeBatchAssetState());
        currentAssetState =
          this.assetChangeStates[this.assetChangeStates.length - 1];
      }
      currentAssetState.mainParams.restore = true;
    }
    if (currentAssetState.mainParams.delete) {
      return true;
    }
    for (const key of [
      'index',
      'isAbstract',
      'name',
      'parentIds',
      'workspaceId',
      'title',
      'icon',
    ] as (keyof AssetChangerChangeMainParams)[]) {
      if (change[key] !== undefined) {
        (currentAssetState.mainParams as any)[key] = change[key];
      }
    }
    if (change.blocks) {
      for (const [block_ref, block_ch] of Object.entries(change.blocks)) {
        let block_state = currentAssetState.blockStates.get(block_ref);
        if (!block_state) {
          block_state = new AssetChangeBatchBlockState();
          currentAssetState.blockStates.set(block_ref, block_state);
        }
        if (block_ch.delete) {
          if (block_state.mainParams.type) {
            // Was new
            currentAssetState.blockStates.delete(block_ref);
          } else {
            block_state.mainParams = {
              delete: true,
            };
            block_state.propOps = [];
          }
        } else {
          if (block_ch.type && block_state.mainParams.delete) {
            // Recreating block
            this.assetChangeStates.push(new AssetChangeBatchAssetState());
            currentAssetState =
              this.assetChangeStates[this.assetChangeStates.length - 1];
            block_state = new AssetChangeBatchBlockState();
            currentAssetState.blockStates.set(block_ref, block_state);
          }
          for (const key of [
            'index',
            'name',
            'title',
            'type',
            'reset',
          ] as (keyof AssetBlockParamsDTO)[]) {
            if (block_ch[key] !== undefined) {
              (block_state.mainParams as any)[key] = block_ch[key];
            }
          }
          if (block_ch.props) {
            if (Array.isArray(block_ch.props)) {
              for (const props_ch of block_ch.props) {
                block_state.feedPropsChange(props_ch);
              }
            } else {
              block_state.feedPropsChange(block_ch.props);
            }
          }
        }
      }
    }
  }

  addChanges(changes: AssetChangeContent[]) {
    for (const change of changes) {
      this.addChange(change);
    }
  }

  getBatch(): AssetChangeContent[] {
    const res: AssetChangeContent[] = [];
    for (const state of this.assetChangeStates) {
      const change = state.getGroupedChange();
      if (Object.keys(change).length > 0) {
        res.push(change);
      }
    }
    return res;
  }
}
