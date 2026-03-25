import type { AssetForEdit, AssetReferenceEntity } from '../types/AssetsType';
import DialogManager from '../managers/DialogManager';
import type { UiNavigationGuardHandler } from '../managers/UiManager';
import UiManager from '../managers/UiManager';
import type { ResolvedAssetBlock, ResolvedAssetBlocks } from '../utils/assets';
import {
  calcResolvedBlocks,
  type AssetFullInstanceR,
} from '../types/AssetFullInstance';
import AssetRefsDialog from '../../components/Asset/References/AssetRefsDialog.vue';
import {
  makeBlockRef,
  mergeInheritedProps,
  stringifyAssetNewBlockRef,
  type AssetProps,
} from '../types/Props';
import { AssetRights } from '../types/Rights';
import type { AssetChanger, BlockCursor } from '../types/AssetChanger';
import { assert } from '../utils/typeUtils';
import ConfirmDialog from '../../components/Common/ConfirmDialog.vue';
import { computed, reactive, unref, type ComputedRef } from 'vue';
import { AssetPropWhereOpKind } from '../types/PropsWhere';
import type { BlockTypeDefinition } from '../types/BlockTypeDefinition';
import type ImcEditor from '../../components/ImcText/ImcEditor.vue';
import type { ExtendedMenuListItem } from '../types/MenuList';
import {
  getBetweenIndexWithTimestamp,
  getNextIndexWithTimestamp,
} from '../../components/Asset/Editor/blockUtils';
import type { IEditorVM } from './IEditorVM';
import type { IAssetBlockComponent } from '../types/IAssetBlockComponent';
import { GAME_INFO_ASSET_ID, MARKDOWN_ASSET_ID } from '../constants';
import type { AssetHistoryVM } from './AssetHistoryVM';
import { AssetChangerDefault } from '../types/AssetChangerDefault';
import type { EditorContextForAssetRequested } from '#logic/project-sub-contexts/EditorSubContext';
import type { IProjectContext } from '#logic/types/IProjectContext';
import EditorSubContext from '#logic/project-sub-contexts/EditorSubContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';

type CopiedBlock = {
  title: string | null;
  type: string;
  props: AssetProps;
};

export class AssetBlockEditorVM implements IEditorVM {
  projectContext: IProjectContext;
  assetFull: AssetFullInstanceR | null;
  assetEditedComp!: ComputedRef<AssetForEdit | null>;
  saveOnBlockCommit: boolean;
  private _assetChanger: AssetChanger;
  copiedBlock: CopiedBlock | null = null;
  private _navigationGuardHandler: UiNavigationGuardHandler | null = null;
  sharedState: AssetProps = {};
  editingBlockId: string | null = null;
  editorContextForAssetRequest: EditorContextForAssetRequested | null = null;
  private _mountedComponents = new Map<string, IAssetBlockComponent>();
  historyModeVM: AssetHistoryVM | null = null;

  static CreateInstance(
    projectContext: IProjectContext,
    asset: AssetFullInstanceR | null,
  ): AssetBlockEditorVM {
    const raw = new AssetBlockEditorVM(projectContext, asset);
    const res = reactive(raw);
    raw.assetEditedComp = computed(() => {
      return res.assetFull
        ? res.assetChanger.applyChanges(res.assetFull)
        : null;
    });
    return res as unknown as AssetBlockEditorVM;
  }

  applyAssetChanges(asset: AssetForEdit): AssetForEdit {
    const asset_edited = unref(this.assetEditedComp);
    if (asset.id === asset_edited?.id) {
      return asset_edited;
    }
    return asset;
  }

  getAssetBlockEditorForAsset(assetId: string): AssetBlockEditorVM | null {
    const asset_edited = unref(this.assetEditedComp);
    if (assetId === asset_edited?.id) {
      return this;
    }
    return null;
  }

  protected constructor(
    projectContext: IProjectContext,
    asset: AssetFullInstanceR | null,
  ) {
    this.projectContext = projectContext;
    this.assetFull = asset;
    this.saveOnBlockCommit =
      this.projectContext.appManager.$appConfiguration.saveOnBlockCommit;
    this._assetChanger = new AssetChangerDefault(this.projectContext, asset);

    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    ) {
      const saved_copied_json = window.localStorage.getItem(
        'AssetEditorToolbar-copied',
      );
      if (saved_copied_json) {
        try {
          const saved_copied = JSON.parse(saved_copied_json);
          this.copiedBlock = saved_copied;
        } catch (err: any) {
          console.error('AssetBlockEditor: bad block in copied', err);
        }
      }
    }
  }

  async saveHistoryCopy(): Promise<void> {
    await this.historyModeVM?.saveAsCopy(this.historyModeVM.selectedVersionId);
    this.historyModeVM = null;
  }

  get assetChanger(): AssetChanger {
    if (this.historyModeVM) {
      return this.historyModeVM.assetChanger;
    } else {
      return this._assetChanger;
    }
  }

  get assetEdited() {
    return unref(this.assetEditedComp);
  }

  destroy() {
    this._resetNavigationGuard();
    this.projectContext.get(EditorSubContext).deactivateEditor(this);
    if (this.editorContextForAssetRequest) {
      this.editorContextForAssetRequest.release();
      this.editorContextForAssetRequest = null;
    }
  }

  async init() {
    if (this.assetFull) {
      this.editorContextForAssetRequest = this.projectContext
        .get(EditorSubContext)
        .requestEditorContextForAsset(this.assetFull.id);
      await this.editorContextForAssetRequest.promise;
    }
  }

  initClient(viewerOnly = false) {
    if (!viewerOnly) {
      this._initNavigationGuard();
      this.projectContext.get(EditorSubContext).activateEditor(this);
    }
  }

  private _resetNavigationGuard() {
    if (!this._navigationGuardHandler) return;
    this._navigationGuardHandler.cancel();
    this._navigationGuardHandler = null;
  }

  private _initNavigationGuard() {
    if (this._navigationGuardHandler) return;
    this._navigationGuardHandler = this.projectContext.appManager
      .get(UiManager)
      .setNavigationGuard(
        () => !this.getHasChanges(),
        async () => {
          if (this.getIsReadonly()) {
            return true;
          }
          if (this.saveOnBlockCommit) {
            await this.saveChanges();
            return true;
          } else {
            const confirm = await this.projectContext.appManager
              .get(DialogManager)
              .show(ConfirmDialog, {
                message: this.projectContext.appManager.$t(
                  'common.dialogs.unsavedChanges',
                ),
              });
            return !!confirm;
          }
        },
      );
  }

  assetFullsCount() {
    return this.assetFull ? 1 : 0;
  }

  getRootCombinedReferences(): AssetReferenceEntity[] {
    if (!this.assetFull) return [];
    return this.assetFull.rootReferences;
  }

  enterEditMode(blockId: string) {
    this.editingBlockId = blockId;
  }

  exitEditMode() {
    this.editingBlockId = null;
  }

  get editingBlock(): ResolvedAssetBlock | null {
    if (!this.editingBlockId) return null;
    return this.getResolvedBlockById(this.editingBlockId);
  }

  get editingBlockController(): BlockTypeDefinition | null {
    const block = this.editingBlock;
    if (!block) return null;

    const block_type_controller = this.projectContext
      .get(EditorSubContext)
      .getBlockTypesMap()[block.type];
    if (!block_type_controller) {
      return null;
    }

    return block_type_controller;
  }

  getEditingBlockCursor(): BlockCursor | null {
    const block = this.editingBlock;
    if (!block) return null;

    const selection = window.getSelection();
    if (!selection) return null;

    let field_node = selection.focusNode;
    while (
      field_node &&
      !(
        (field_node as HTMLElement).dataset &&
        (field_node as HTMLElement).dataset.imsBlockKey
      )
    ) {
      field_node = field_node.parentNode;
    }
    if (!field_node) return null;
    const block_key = (field_node as HTMLElement).dataset.imsBlockKey;
    if (!block_key) return null;

    const cursor: BlockCursor = {
      blockRef: makeBlockRef(block),
      blockKey: block_key,
      offset: 0,
    };

    if ((field_node as any).__imc_editor) {
      const imc_editor = (field_node as any).__imc_editor as InstanceType<
        typeof ImcEditor
      >;
      if (imc_editor.quillController.quill) {
        const imc_editor_selection =
          imc_editor.quillController.quill.getSelection();
        if (imc_editor_selection) {
          cursor.offset = imc_editor_selection.index;
        }
      }
    }

    return cursor;
  }

  getResolvedBlockById(block_id: string): ResolvedAssetBlock | null {
    const resolved_blocks = this.resolveBlocks();
    return resolved_blocks.mapIds[block_id] ?? null;
  }

  isBlockEditing(block_id: string) {
    return block_id === this.editingBlockId;
  }

  resolveBlocks(): ResolvedAssetBlocks {
    if (!this.assetEdited || !this.assetFull) {
      return {
        done: true,
        list: [],
        mapIds: {},
        mapNames: {},
      };
    }
    this.assetFull.activate();
    return reactive(calcResolvedBlocks(this.assetEdited));
  }

  async refreshAssets() {
    if (!this.assetFull) {
      return;
    }
    await this.projectContext.get(AssetSubContext).getAssetInstancesList({
      where: {
        id: [this.assetFull.id],
      },
    });
  }

  getHasChanges(): boolean {
    if (!this.assetFull) return false;
    return this.assetChanger.hasChanges(this.assetFull);
  }

  isSaving(): boolean {
    return this.assetChanger.isSaving;
  }

  isUndoRedoBusy(): false | 'undo' | 'redo' {
    return this.assetChanger.isUndoRedoBusy;
  }

  canUndo(): boolean {
    return this.assetChanger.canUndo;
  }

  canRedo(): boolean {
    return this.assetChanger.canRedo;
  }

  async undo(): Promise<void> {
    await this.assetChanger.undo();
  }

  async redo(): Promise<void> {
    await this.assetChanger.redo();
  }

  async saveChanges(): Promise<boolean> {
    if (!this.assetFull) {
      return false;
    }
    const res = await this.assetChanger.saveChanges();
    this.historyModeVM = null;
    return res;
  }

  async changeBlockServiceName(
    block: ResolvedAssetBlock,
    new_name: string | null,
  ) {
    const asset_id = this.assetFull ? this.assetFull.id : null;
    if (!asset_id) {
      return;
    }
    if (block.name === new_name) {
      return; // Nothing to change
    }
    await this.assetChanger.executeTask(async () => {
      const change_res = await this.projectContext
        .get(AssetSubContext)
        .changeAssets({
          set: {
            blocks: {
              [stringifyAssetNewBlockRef(
                block.name,
                block.name !== null ? null : block.id,
              )]: {
                name: new_name,
              },
            },
          },
          where: {
            // Change current asset and its child
            or: {
              op: AssetPropWhereOpKind.OR,
              v: [
                {
                  id: asset_id,
                },
                {
                  typeids: asset_id,
                  ownblocks: new_name
                    ? {
                        op: AssetPropWhereOpKind.EQUAL_NOT,
                        v: new_name,
                      }
                    : undefined,
                },
              ],
            },
          },
        });
      return async () => {
        if (change_res.changeId) {
          await this.projectContext.get(AssetSubContext).changeAssetsUndo({
            changeId: change_res.changeId,
          });
        }
      };
    });
  }

  async commitBlock(_block_ref: string): Promise<boolean> {
    if (!this.assetFull) {
      return false;
    }

    if (this.saveOnBlockCommit) {
      return await this.saveChanges();
    }

    return true;
  }

  getBlockByName(name: string): ResolvedAssetBlock | null {
    const blocks = this.resolveBlocks();
    return blocks.mapNames.hasOwnProperty(name) ? blocks.mapNames[name] : null;
  }

  async createBlock(
    type: string,
    params?: {
      index?: number;
      title?: string | null;
      props?: AssetProps;
    },
  ): Promise<ResolvedAssetBlock | null> {
    const asset_full = this.assetFull;
    assert(asset_full);
    const blocks = this.resolveBlocks();
    const default_title = params?.title ?? null;

    const block_type_controller = this.projectContext
      .get(EditorSubContext)
      .getBlockTypesMap()[type];
    if (!block_type_controller) {
      throw new Error('Unregistered block type');
    }
    const block_params = await block_type_controller.beforeBlockCreate(
      this.projectContext,
      {
        title: default_title,
      },
    );
    if (!block_params) return null; // Cancelled

    let max_index = 0;
    for (const b of blocks.list) {
      if (b.index > max_index) max_index = b.index;
    }
    let new_index = 0;
    if (params?.index) {
      new_index = params.index;
    } else {
      new_index = parseFloat(
        Math.ceil(max_index) + 1 + '.' + new Date().getTime(),
      );
    }

    if (params?.props !== undefined) {
      block_params.props = params?.props;
    }
    const created = this.assetChanger.createBlock(asset_full.id, {
      type,
      title: block_params.title ?? undefined,
      index: new_index,
      props: block_params.props ? block_params.props : undefined,
    });

    const new_resolved_block = this.getResolvedBlockById(created.blockId);
    return new_resolved_block;
  }

  async openCreateRefDialog(reverse = false): Promise<string[]> {
    if (!this.assetFull) return [];
    const asset_id = this.assetFull.id;
    const asset_short_ids: string[] = [];
    await this.projectContext.appManager.get(UiManager).doTask(async () => {
      const refs_result = await this.projectContext.appManager
        .get(DialogManager)
        .show(AssetRefsDialog, {
          assetIds: [asset_id],
          reverse,
        });
      if (refs_result && refs_result.length > 0) {
        for (const ref of refs_result) {
          asset_short_ids.push(...ref.ids);
        }
      }
    });
    return asset_short_ids;
  }

  async deleteRef(
    ref: {
      sourceAssetId: string;
      sourceBlockId: string | null;
      targetAssetId: string;
      targetBlockId: string | null;
    },
    silent?: boolean,
  ): Promise<boolean> {
    const answer = silent
      ? silent
      : await this.projectContext.appManager
          .get(DialogManager)
          .show(ConfirmDialog, {
            header: this.projectContext.appManager.$t(
              'assetEditor.blockMenu.deleteLink',
            ),
            message: this.projectContext.appManager.$t(
              'assetEditor.blockMenu.deleteLinkConfirm',
            ),
            yesCaption: this.projectContext.appManager.$t(
              'common.dialogs.delete',
            ),
            danger: true,
          });
    if (answer) {
      await this.projectContext.appManager.get(UiManager).doTask(async () => {
        await this.projectContext.get(AssetSubContext).deleteRef({
          where: {
            id: [ref.sourceAssetId],
          },
          blockId: ref.sourceBlockId,
          targetAssetId: ref.targetAssetId,
          targetBlockId: ref.targetBlockId,
        });
      });
      return true;
    } else return false;
  }

  async reorderBlocks(reordered_blocks: ResolvedAssetBlock[]) {
    const asset_full = this.assetFull;
    assert(asset_full);

    if (reordered_blocks.length === 0) {
      return;
    }

    let start_index = 100000000000;
    reordered_blocks.forEach((item) => {
      if (item.index) {
        start_index = Math.min(item.index, start_index);
      }
    });
    if (start_index === 100000000000) {
      start_index = 0;
    }
    const op = this.assetChanger.makeOpId();
    reordered_blocks.forEach(async (block, _i) => {
      this.assetChanger.changeBlockParams(
        asset_full.id,
        makeBlockRef(block),
        {
          index: ++start_index,
        },
        op,
      );
    });

    if (this.saveOnBlockCommit) {
      await this.saveChanges();
    }
  }

  getIsReadonly(): boolean {
    if (!this.assetFull) {
      return true;
    }
    if (this.historyModeVM) return true;
    return this.assetFull.rights < 2;
  }

  canDragBlocks(): boolean {
    if (this.getIsReadonly()) {
      return false;
    }
    if (!this.assetFull) {
      return false;
    }
    return this.assetFull.rights === AssetRights.FULL_ACCESS;
  }

  canAddBlocks(): boolean {
    if (this.getIsReadonly()) {
      return false;
    }
    if (!this.assetFull) {
      return false;
    }
    if (
      this.assetFull.typeIds.includes(GAME_INFO_ASSET_ID) ||
      this.assetFull.typeIds.includes(MARKDOWN_ASSET_ID) ||
      this.assetFull.id === GAME_INFO_ASSET_ID ||
      this.assetFull.id === MARKDOWN_ASSET_ID
    ) {
      return false;
    }
    return this.assetFull.rights === AssetRights.FULL_ACCESS;
  }

  canCommentBlocks(): boolean {
    if (this.getIsReadonly()) {
      return false;
    }
    if (!this.assetFull) {
      return false;
    }
    return this.assetFull.rights >= AssetRights.COMMENT;
  }

  copyEditingBlock() {
    const editing = this.editingBlock;
    if (!editing) return;
    const props = mergeInheritedProps(editing.inherited ?? {}, editing.props);
    this.copiedBlock = {
      title: editing.title,
      type: editing.type,
      props,
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'AssetEditorToolbar-copied',
        JSON.stringify(this.copiedBlock),
      );
      this.projectContext.appManager
        .get(UiManager)
        .showSuccess(
          this.projectContext.appManager.$t('assetEditor.toolbarCopyBlockDone'),
        );
    } else {
      this.projectContext.appManager
        .get(UiManager)
        .showError('Window is undefined');
    }
  }

  copyEditingBlockAsBlockMirror() {
    const editing = this.editingBlock;
    if (!editing) return;
    const editing_asset = this.assetFull;
    if (!editing_asset) return;
    this.copiedBlock = {
      title: editing.title,
      type: 'block-mirror',
      props: {
        asset: editing_asset.convertToAssetPropValue(),
        block_ref: stringifyAssetNewBlockRef(
          editing.name,
          editing.name ? null : editing.id,
        ),
      },
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'AssetEditorToolbar-copied',
        JSON.stringify(this.copiedBlock),
      );
      this.projectContext.appManager
        .get(UiManager)
        .showSuccess(
          this.projectContext.appManager.$t(
            'assetEditor.toolbarCopyBlockAsBlockMirrorDone',
          ),
        );
    } else {
      this.projectContext.appManager
        .get(UiManager)
        .showError('Window is undefined');
    }
  }
  pasteBlock() {
    const copied = JSON.parse(
      window?.localStorage.getItem('AssetEditorToolbar-copied') ?? '',
    );
    if (!copied) return;
    const blocks = this.resolveBlocks();
    const editing = this.editingBlock;
    let index1: number;
    let index2: number | null = null;
    if (editing) {
      index1 = editing.index;
      const block_ind = blocks.list.findIndex((b) => b.id === editing.id);
      if (block_ind < blocks.list.length - 1) {
        index2 = blocks.list[block_ind + 1].index;
      }
    } else {
      index1 =
        blocks.list.length > 0 ? blocks.list[blocks.list.length - 1].index : 0;
    }
    const new_index =
      index2 !== null
        ? getBetweenIndexWithTimestamp(index1, index2)
        : getNextIndexWithTimestamp(index1);
    this.createBlock(copied.type, {
      index: new_index,
      title: copied.title,
      props: copied.props,
    });
    this.projectContext.appManager
      .get(UiManager)
      .showSuccess(
        this.projectContext.appManager.$t('assetEditor.toolbarPasteBlockDone'),
      );
  }

  getToolbarActions(): ExtendedMenuListItem[] {
    if (this.historyModeVM) {
      return [
        {
          name: 'history',
          title: this.projectContext.appManager.$t('gddPage.saveAsCopy'),
          icon: 'ri-file-copy-fill',
          action: async () => await this.saveHistoryCopy(),
          type: 'button',
        },
      ];
    }
    return [
      {
        name: 'blockCopy',
        isMain: true,
        title: this.projectContext.appManager.$t(
          'assetEditor.toolbarCopyBlock',
        ),
        disabled: !this.editingBlock,
        icon: 'ri-file-copy-fill',
        action: () => {
          this.copyEditingBlock();
        },
      },
      {
        name: 'blockPaste',
        isMain: true,
        title: this.projectContext.appManager.$t(
          'assetEditor.toolbarPasteBlock',
        ),
        disabled: false,
        icon: 'ri-clipboard-fill',
        action: () => {
          this.pasteBlock();
        },
      },
      {
        name: 'blockCopyAsMirror',
        icon: 'ims-icon-font-block-link',
        title: this.projectContext.appManager.$t(
          'assetEditor.toolbarCopyBlockAsBlockMirror',
        ),
        tooltip: this.projectContext.appManager.$t(
          'assetEditor.toolbarCopyBlockAsBlockMirrorHint',
        ),
        action: () => this.copyEditingBlockAsBlockMirror(),
        disabled: !this.editingBlock,
      },
    ];
  }

  setBlockMounted(blockId: string, component: IAssetBlockComponent) {
    this._mountedComponents.set(blockId, component);
  }

  setBlockUnmounted(blockId: string) {
    this._mountedComponents.delete(blockId);
  }

  getBlockMountedComponent<Component extends IAssetBlockComponent>(
    blockId: string,
  ): Component | null {
    return (
      (this._mountedComponents.get(blockId) as Component | undefined) ?? null
    );
  }

  revealBlockContentIds(blockId: string, item_ids: string[]) {
    if (!this.assetFull) {
      return;
    }
    this.projectContext
      .get(EditorSubContext)
      .revealBlockContentIds(this.assetFull.id, blockId, item_ids);
  }
}
