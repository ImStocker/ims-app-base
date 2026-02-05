import type { IAppManager } from '../managers/IAppManager';
import CreatorAssetManager from '../managers/CreatorAssetManager';
import type {
  AssetForEdit,
  AssetQueryWhere,
  AssetReferenceEntity,
  AssetShort,
} from '../types/AssetsType';
import DialogManager from '../managers/DialogManager';
import type { UiNavigationGuardHandler } from '../managers/UiManager';
import UiManager from '../managers/UiManager';
import type { ResolvedAssetBlock, ResolvedAssetBlocks } from '../utils/assets';
import {
  calcResolvedBlocks,
  copyAssetFullData,
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
import {
  AssetChanger,
  type BlockCursor,
  type HistorySaveResponse,
} from '../types/AssetChanger';
import ProjectManager from '../managers/ProjectManager';
import { assert } from '../utils/typeUtils';
import ConfirmDialog from '../../components/Common/ConfirmDialog.vue';
import type {
  ApiRequestList,
  ApiResultListWithTotal,
  ProjectFullInfo,
} from '../types/ProjectTypes';
import type { IProjectContext } from '../types/IProjectContext';
import { computed, reactive, unref, type ComputedRef } from 'vue';
import { AssetPropWhereOpKind } from '../types/PropsWhere';
import EditorManager, {
  type EditorContextForAssetRequested,
} from '../managers/EditorManager';
import type { BlockTypeDefinition } from '../types/BlockTypeDefinition';
import type ImcEditor from '../../components/ImcText/ImcEditor.vue';
import type { ExtendedMenuListItem } from '../types/MenuList';
import {
  getBetweenIndexWithTimestamp,
  getNextIndexWithTimestamp,
} from '../../components/Asset/Editor/blockUtils';
import type { Workspace, WorkspaceQueryDTOWhere } from '../types/Workspaces';
import type { IEditorVM } from './IEditorVM';
import type { IAssetBlockComponent } from '../types/IAssetBlockComponent';
import { GAME_INFO_ASSET_ID, MARKDOWN_ASSET_ID } from '../constants';

type CopiedBlock = {
  title: string | null;
  type: string;
  props: AssetProps;
};

export class AssetBlockEditorVM implements IProjectContext, IEditorVM {
  appManager: IAppManager;
  assetFull: AssetFullInstanceR | null;
  assetEditedComp!: ComputedRef<AssetForEdit | null>;
  saveOnBlockCommit: boolean;
  assetChanger: AssetChanger;
  copiedBlock: CopiedBlock | null = null;
  private _navigationGuardHandler: UiNavigationGuardHandler | null = null;
  private _projectInfo: ProjectFullInfo | null;
  sharedState: AssetProps = {};
  editingBlockId: string | null = null;
  editorContextForAssetRequest: EditorContextForAssetRequested | null = null;
  private _mountedComponents = new Map<string, IAssetBlockComponent>();

  static CreateInstance(
    appManager: IAppManager,
    asset: AssetFullInstanceR | null,
    projectInfo?: ProjectFullInfo,
  ): AssetBlockEditorVM {
    const raw = new AssetBlockEditorVM(appManager, asset, projectInfo);
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
    appManager: IAppManager,
    asset: AssetFullInstanceR | null,
    projectInfo?: ProjectFullInfo,
  ) {
    this.appManager = appManager;
    this.assetFull = asset;
    this.saveOnBlockCommit =
      this.appManager.$appConfiguration.saveOnBlockCommit;
    this.assetChanger = new AssetChanger(async (requests) => {
      const response: HistorySaveResponse = {
        originals: [],
      };
      if (!this.assetFull) return response;
      for (const request of requests) {
        if (request.assetId !== this.assetFull.id) continue;
        const original = copyAssetFullData(this.assetFull);
        response.originals.push(original);
        await this.appManager.get(CreatorAssetManager).makeAssetMultipleChange(
          {
            id: [original.id],
          },
          request.changes,
          this.projectInfo ? { pid: this.projectInfo.id } : {},
        );
      }
      return response;
    });
    this._projectInfo = projectInfo ?? null;

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

  get assetEdited() {
    return unref(this.assetEditedComp);
  }

  destroy() {
    this._resetNavigationGuard();
    this.appManager.get(EditorManager).deactivateEditor(this);
    if (this.editorContextForAssetRequest) {
      this.editorContextForAssetRequest.release();
      this.editorContextForAssetRequest = null;
    }
  }

  async init() {
    if (this.assetFull) {
      this.editorContextForAssetRequest = this.appManager
        .get(EditorManager)
        .requestEditorContextForAsset(this.assetFull.id);
      await this.editorContextForAssetRequest.promise;
    }
  }

  initClient(viewerOnly = false) {
    if (!viewerOnly) {
      this._initNavigationGuard();
      this.appManager.get(EditorManager).activateEditor(this);
    }
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
        () => !this.getHasChanges(),
        async () => {
          if (this.saveOnBlockCommit) {
            await this.saveChanges();
            return true;
          } else {
            const confirm = await this.appManager
              .get(DialogManager)
              .show(ConfirmDialog, {
                message: this.appManager.$t('common.dialogs.unsavedChanges'),
              });
            return !!confirm;
          }
        },
      );
  }

  get projectInfo(): ProjectFullInfo {
    if (this._projectInfo) {
      return this._projectInfo;
    }
    const res = this.appManager.get(ProjectManager).getProjectInfo();
    assert(res);
    return res;
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

    const block_type_controller = this.appManager
      .get(EditorManager)
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
    return calcResolvedBlocks(this.assetEdited);
  }

  async refreshAssets() {
    if (!this.assetFull) {
      return;
    }
    await this.appManager.get(CreatorAssetManager).getAssetInstancesList({
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
    return await this.assetChanger.saveChanges();
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
      const change_res = await this.appManager
        .get(CreatorAssetManager)
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
          await this.appManager.get(CreatorAssetManager).changeAssetsUndo({
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

    const block_type_controller = this.appManager
      .get(EditorManager)
      .getBlockTypesMap()[type];
    if (!block_type_controller) {
      throw new Error('Unregistered block type');
    }
    const block_params = await block_type_controller.beforeBlockCreate(
      this.appManager,
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
    await this.appManager.get(UiManager).doTask(async () => {
      const refs_result = await this.appManager
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
      : await this.appManager.get(DialogManager).show(ConfirmDialog, {
          header: this.appManager.$t('assetEditor.blockMenu.deleteLink'),
          message: this.appManager.$t(
            'assetEditor.blockMenu.deleteLinkConfirm',
          ),
          yesCaption: this.appManager.$t('common.dialogs.delete'),
          danger: true,
        });
    if (answer) {
      await this.appManager.get(UiManager).doTask(async () => {
        await this.appManager.get(CreatorAssetManager).deleteRef({
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
    return this.assetFull.rights < 2;
  }

  canDragBlocks(): boolean {
    if (!this.assetFull) {
      return false;
    }
    return this.assetFull.rights === AssetRights.FULL_ACCESS;
  }

  canAddBlocks(): boolean {
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
    if (!this.assetFull) {
      return false;
    }
    return this.assetFull.rights >= AssetRights.COMMENT;
  }

  getAssetShortViaCache(assetId: string): Promise<AssetShort | null> {
    return this.appManager
      .get(CreatorAssetManager)
      .getAssetShortViaCache(assetId);
  }

  async requestAssetShortInCache(assetId: string): Promise<void> {
    await this.appManager
      .get(CreatorAssetManager)
      .requestAssetShortInCache(assetId);
  }

  getAssetShortViaCacheSync(assetId: string): AssetShort | null | undefined {
    return this.appManager
      .get(CreatorAssetManager)
      .getAssetShortViaCacheSync(assetId);
  }

  getAssetShortsList(
    query: ApiRequestList<AssetQueryWhere>,
  ): Promise<ApiResultListWithTotal<AssetShort>> {
    return this.appManager.get(CreatorAssetManager).getAssetShortsList(query);
  }

  getAssetInstance(
    assetId: string,
    refresh = false,
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
      this.appManager
        .get(UiManager)
        .showSuccess(this.appManager.$t('assetEditor.toolbarCopyBlockDone'));
    } else {
      this.appManager.get(UiManager).showError('Window is undefined');
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
      this.appManager
        .get(UiManager)
        .showSuccess(
          this.appManager.$t('assetEditor.toolbarCopyBlockAsBlockMirrorDone'),
        );
    } else {
      this.appManager.get(UiManager).showError('Window is undefined');
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
    this.appManager
      .get(UiManager)
      .showSuccess(this.appManager.$t('assetEditor.toolbarPasteBlockDone'));
  }

  getToolbarActions(): ExtendedMenuListItem[] {
    return [
      {
        name: 'blockCopy',
        isMain: true,
        title: this.appManager.$t('assetEditor.toolbarCopyBlock'),
        disabled: !this.editingBlock,
        icon: 'ri-file-copy-fill',
        action: () => {
          this.copyEditingBlock();
        },
      },
      {
        name: 'blockPaste',
        isMain: true,
        title: this.appManager.$t('assetEditor.toolbarCopyBlock'),
        disabled: false,
        icon: 'ri-clipboard-fill',
        action: () => {
          this.pasteBlock();
        },
      },
      {
        name: 'blockCopyAsMirror',
        icon: 'ims-icon-font-block-link',
        title: this.appManager.$t('assetEditor.toolbarCopyBlockAsBlockMirror'),
        tooltip: this.appManager.$t(
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
    this.appManager
      .get(EditorManager)
      .revealBlockContentIds(this.assetFull.id, blockId, item_ids);
  }
}
