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
import ProjectManager from '../managers/ProjectManager';
import { assert } from '../utils/typeUtils';
import { generateNextUniqueNameNumber } from '../utils/stringUtils';
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
import {
  GAME_INFO_ASSET_ID,
  MARKDOWN_ASSET_ID,
  TASK_ASSET_ID,
} from '../constants';
import type { AssetHistoryVM } from './AssetHistoryVM';
import { AssetChangerDefault } from '../types/AssetChangerDefault';

type ClipboardBlockEntry = {
  type: string;
  title?: string | null;
  name?: string | null;
  props: AssetProps;
};

export class AssetBlockEditorVM implements IProjectContext, IEditorVM {
  appManager: IAppManager;
  assetFull: AssetFullInstanceR | null;
  assetEditedComp!: ComputedRef<AssetForEdit | null>;
  saveOnBlockCommit: boolean;
  private _assetChanger: AssetChanger;
  selectedBlockIds: Set<string> = new Set();
  private _navigationGuardHandler: UiNavigationGuardHandler | null = null;
  private _projectInfo: ProjectFullInfo | null;
  sharedState: AssetProps = {};
  editingBlockId: string | null = null;
  editorContextForAssetRequest: EditorContextForAssetRequested | null = null;
  private _mountedComponents = new Map<string, IAssetBlockComponent>();
  historyModeVM: AssetHistoryVM | null = null;

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
    this._assetChanger = new AssetChangerDefault(
      this.appManager,
      asset,
      projectInfo?.id ?? null,
    );
    this._projectInfo = projectInfo ?? null;
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
          if (this.getIsReadonly()) {
            return true;
          }
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
      const imc_editor_selection = imc_editor.getSelection();
      if (imc_editor_selection) {
        cursor.offset = imc_editor_selection.index;
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
      name?: string | null;
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
      name: params?.name ?? undefined,
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

  isBlockSelected(block_id: string): boolean {
    return this.selectedBlockIds.has(block_id);
  }

  toggleBlockSelected(block_id: string) {
    if (this.selectedBlockIds.has(block_id)) {
      this.selectedBlockIds.delete(block_id);
    } else {
      this.selectedBlockIds.add(block_id);
    }
  }

  setBlockSelectionRange(from_block_id: string, to_block_id: string) {
    const blocks = this.resolveBlocks().list;
    let from_index = -1;
    let to_index = -1;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].id === from_block_id) {
        from_index = i;
      }
      if (blocks[i].id === to_block_id) {
        to_index = i;
      }
    }
    if (from_index < 0 || to_index < 0) {
      return;
    }
    this.selectedBlockIds.clear();
    const min_index = Math.min(from_index, to_index);
    const max_index = Math.max(from_index, to_index);
    for (let i = min_index; i <= max_index; i++) {
      this.selectedBlockIds.add(blocks[i].id);
    }
  }

  clearBlockSelection() {
    this.selectedBlockIds.clear();
  }

  pruneBlockSelection() {
    if (this.selectedBlockIds.size === 0) {
      return;
    }
    const blocks = this.resolveBlocks().list;
    const existing_ids = new Set(blocks.map((b) => b.id));
    for (const block_id of Array.from(this.selectedBlockIds)) {
      if (!existing_ids.has(block_id)) {
        this.selectedBlockIds.delete(block_id);
      }
    }
  }

  private _blockToClipboardEntry(
    block: ResolvedAssetBlock,
  ): ClipboardBlockEntry {
    return {
      type: block.type,
      title: block.title,
      name: block.name ?? null,
      props: mergeInheritedProps(block.inherited ?? {}, block.props),
    };
  }

  private _replaceBlockProps(block: ResolvedAssetBlock, props: AssetProps) {
    const asset_full = this.assetFull;
    assert(asset_full);
    const op = this.assetChanger.makeOpId();
    const old_keys = Object.keys(
      mergeInheritedProps(block.inherited ?? {}, block.props),
    );
    if (old_keys.length > 0) {
      this.assetChanger.deleteBlockPropKeys(
        asset_full.id,
        makeBlockRef(block),
        null,
        old_keys,
        op,
      );
    }
    this.assetChanger.setBlockPropKeys(
      asset_full.id,
      makeBlockRef(block),
      null,
      props,
      op,
    );
  }

  async copySelectedBlocks(): Promise<boolean> {
    const blocks = this.resolveBlocks().list.filter((block) =>
      this.selectedBlockIds.has(block.id),
    );
    if (blocks.length === 0) {
      return false;
    }
    const result = await this._writeBlocksToClipboard(blocks);
    if (result) {
      this.clearBlockSelection();
    }
    return result;
  }

  async copyBlockToClipboard(block_id?: string): Promise<boolean> {
    let editing: ResolvedAssetBlock | null;
    if (block_id) {
      editing = this.getResolvedBlockById(block_id);
    } else {
      editing = this.editingBlock;
    }
    if (!editing) return false;
    return this._writeBlocksToClipboard([editing]);
  }

  private async _writeBlocksToClipboard(
    blocks: ResolvedAssetBlock[],
  ): Promise<boolean> {
    if (blocks.length === 0) {
      return false;
    }
    const entries: ClipboardBlockEntry[] = blocks.map((block) =>
      this._blockToClipboardEntry(block),
    );
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({
          blocks: entries,
        }),
      );
    } catch (err) {
      console.error('AssetBlockEditor: copy blocks to clipboard', err);
      this.appManager
        .get(UiManager)
        .showError(this.appManager.$t('assetEditor.copyBlocksError'));
      return false;
    }
    this.appManager.get(UiManager).showSuccess(
      this.appManager.$t('assetEditor.blocksCopied', {
        count: blocks.length,
      }),
    );
    return true;
  }

  private _parseClipboardEntries(text: string): ClipboardBlockEntry[] {
    const result: ClipboardBlockEntry[] = [];
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return result;
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return result;
    }
    const raw_blocks = (raw as Record<string, unknown>)['blocks'];
    if (!Array.isArray(raw_blocks)) return result;
    const registered_types = this.appManager
      .get(EditorManager)
      .getBlockTypesMap();
    for (const item of raw_blocks) {
      if (typeof item !== 'object' || item === null) continue;
      const entry = item as Record<string, unknown>;
      const type = entry['type'];
      if (typeof type !== 'string' || !registered_types[type]) continue;
      const title = entry['title'];
      const name = entry['name'];
      const props = entry['props'];
      if (title !== undefined && title !== null && typeof title !== 'string') {
        continue;
      }
      if (name !== undefined && name !== null && typeof name !== 'string') {
        continue;
      }
      result.push({
        type,
        title: typeof title === 'string' ? title : null,
        name: typeof name === 'string' ? name : null,
        props:
          props && typeof props === 'object'
            ? (props as AssetProps)
            : ({} as AssetProps),
      });
    }
    return result;
  }

  async pasteBlocksFromClipboard(
    from_index?: number,
    to_index?: number,
  ): Promise<void> {
    const app_manager = this.appManager;
    if (!this.assetFull) return;
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch (err) {
      console.error('AssetBlockEditor: paste blocks from clipboard', err);
      app_manager
        .get(UiManager)
        .showError(app_manager.$t('assetEditor.pasteBlocksError'));
      return;
    }
    if (!text.trim()) {
      app_manager
        .get(UiManager)
        .showError(app_manager.$t('assetEditor.pasteBlocksEmpty'));
      return;
    }
    const entries = this._parseClipboardEntries(text);
    if (entries.length === 0) {
      app_manager
        .get(UiManager)
        .showError(app_manager.$t('assetEditor.pasteBlocksEmpty'));
      return;
    }
    const conflicts = entries.filter((entry) => {
      if (!entry.name) return false;
      const existing = this.getBlockByName(entry.name);
      return !!existing && existing.type === entry.type;
    });
    let overwrite_blocks = false;
    if (conflicts.length > 0) {
      const answer = await app_manager.get(DialogManager).show(ConfirmDialog, {
        header: app_manager.$t('assetEditor.pasteBlocksOverwriteHeader'),
        message: app_manager.$t('assetEditor.pasteBlocksOverwriteMessage'),
        yesCaption: app_manager.$t('assetEditor.pasteBlocksOverwrite'),
        noCaption: app_manager.$t('assetEditor.pasteBlocksInsertNew'),
        withCancel: true,
      });
      if (answer === null || answer === undefined) return;
      overwrite_blocks = answer;
    }
    await app_manager.get(UiManager).doTask(async () => {
      const blocks = this.resolveBlocks();
      let last_index =
        from_index ??
        to_index ??
        (blocks.list.length > 0
          ? blocks.list[blocks.list.length - 1].index
          : 0);
      let pasted_count = 0;
      let updated_count = 0;
      let last_created: ResolvedAssetBlock | null = null;
      for (const entry of entries) {
        const existing = entry.name ? this.getBlockByName(entry.name) : null;
        if (existing && existing.type === entry.type && overwrite_blocks) {
          this._replaceBlockProps(existing, entry.props);
          updated_count++;
          continue;
        }
        if (to_index !== undefined) {
          last_index = getBetweenIndexWithTimestamp(to_index, last_index);
        } else {
          last_index = getNextIndexWithTimestamp(last_index);
        }
        let block_name: string | null = null;
        if (entry.name) {
          if (existing) {
            block_name = generateNextUniqueNameNumber(
              entry.name,
              (name: string) => !this.getBlockByName(name),
            );
          } else {
            block_name = entry.name;
          }
        }
        const created = await this.createBlock(entry.type, {
          index: last_index,
          title: entry.title,
          name: block_name,
          props: entry.props,
        });
        if (created) {
          pasted_count++;
          last_created = created;
        }
      }
      const total_count = pasted_count + updated_count;
      if (total_count > 0) {
        await this.commitBlock(last_created ? last_created.id : '');
        app_manager.get(UiManager).showSuccess(
          app_manager.$t('assetEditor.blocksPasted', {
            count: total_count,
          }),
        );
      }
    });
  }

  getToolbarActions(): ExtendedMenuListItem[] {
    if (this.historyModeVM) {
      return [
        {
          name: 'history',
          title: this.appManager.$t('gddPage.saveAsCopy'),
          icon: 'ri-file-copy-fill',
          action: async () => await this.saveHistoryCopy(),
          type: 'button',
          disabled: !!(
            this.assetFull && this.assetFull.typeIds.includes(TASK_ASSET_ID)
          ),
        },
      ];
    }
    return [
      {
        name: 'blockPaste',
        isMain: true,
        title: this.appManager.$t('assetEditor.toolbarPasteBlock'),
        disabled: false,
        icon: 'ri-clipboard-fill',
        action: () => {
          this.pasteBlocksFromClipboard();
        },
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
