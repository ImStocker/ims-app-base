import type { IAppManager } from '#logic/managers/IAppManager';
import type { AssetChanger } from '#logic/types/AssetChanger';
import { castAssetPropValueToString, makeBlockRef } from '#logic/types/Props';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import { getNextIndexWithTimestamp } from '#components/Asset/Editor/blockUtils';
import type { EditorBlockHandler } from '#components/Asset/Editor/EditorBlock';
import {
  extractChecklistBlockEntries,
  type ChecklistBlockExtractedEntries,
  type ChecklistBlockItemObject,
} from './ChecklistBlock';
import { v4 as uuidv4 } from 'uuid';

export type ChecklistBlockDragProps = {
  isDragAllowed: boolean;
  dragOn: string | null;
  dragWhat: 'checklist_item' | null;
};

export default class ChecklistBlockVM {
  readonly: boolean;
  resolvedBlock: ResolvedAssetBlock;
  assetBlockEditor: AssetBlockEditorVM;
  assetChanger: AssetChanger;
  appManager: IAppManager;
  editorBlockHandler: EditorBlockHandler;

  constructor({
    readonly,
    resolvedBlock,
    assetBlockEditor,
    assetChanger,
    appManager,
    editorBlockHandler,
  }: {
    readonly: boolean;
    resolvedBlock: ResolvedAssetBlock;
    assetBlockEditor: AssetBlockEditorVM;
    assetChanger: AssetChanger;
    appManager: IAppManager;
    editorBlockHandler: EditorBlockHandler;
  }) {
    this.readonly = readonly;
    this.resolvedBlock = resolvedBlock;
    this.assetBlockEditor = assetBlockEditor;
    this.assetChanger = assetChanger;
    this.appManager = appManager;
    this.editorBlockHandler = editorBlockHandler;
  }

  // TODO: fix reactivity loss (doesn't work if try to use this.resolvedBlock)
  getRealEntries(
    resolved_block: ResolvedAssetBlock,
  ): ChecklistBlockExtractedEntries {
    return extractChecklistBlockEntries(resolved_block);
  }

  // TODO: fix reactivity loss (doesn't work if try to use this.resolvedBlock)
  getEntries(resolved_block: ResolvedAssetBlock) {
    const extr = this.getRealEntries(resolved_block);
    if (!this.readonly) {
      return {
        list: [
          ...extr.list.filter((item) =>
            castAssetPropValueToString(item.title)
              .toLocaleLowerCase()
              .includes(
                castAssetPropValueToString(
                  this.assetBlockEditor.sharedState[
                    'checklist-controls\\query'
                  ],
                ).toLocaleLowerCase(),
              ),
          ),
          {
            checked: false,
            inherited: false,
            key: uuidv4(),
            task: null,
            title: '',
            index: getNextIndexWithTimestamp(extr.maxIndex),
          },
        ],
        map: extr.map,
        maxIndex: getNextIndexWithTimestamp(extr.maxIndex),
      };
    }
    return extr;
  }

  async save() {
    this.assetBlockEditor.exitEditMode();
    await this.editorBlockHandler.save();
  }

  async checkEntry(entry: ChecklistBlockItemObject, new_completed: boolean) {
    if (this.readonly) return;
    this.assetChanger.setBlockPropKeys(
      this.resolvedBlock.assetId,
      makeBlockRef(this.resolvedBlock),
      null,
      {
        [`${entry.key}\\checked`]: new_completed ? true : null,
        [`${entry.key}\\task`]: null,
      },
    );
  }

  isEntryCheckInProcess(_entry: ChecklistBlockItemObject) {
    return false;
  }

  deleteEntryByKey(entry_key: string) {
    this.assetChanger.deleteBlockPropKey(
      this.resolvedBlock.assetId,
      makeBlockRef(this.resolvedBlock),
      null,
      `${entry_key}`,
    );
  }

  isEntryLoading(_entry: ChecklistBlockItemObject) {
    return false;
  }

  isEntryChecked(entry: ChecklistBlockItemObject) {
    return entry.checked;
  }
}
