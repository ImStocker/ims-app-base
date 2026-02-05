import { computed, reactive, unref, watch, type ComputedRef } from 'vue';
import type { ResolvedAssetBlocks } from '../utils/assets';
import {
  calcResolvedBlocks,
  type AssetFullInstanceR,
} from './AssetFullInstance';
import type {
  BlockContentItem,
  BlockTypeDefinition,
} from './BlockTypeDefinition';
import type { BlockEditorController } from './BlockEditorController';
import type { IAppManager } from '../managers/IAppManager';
import EditorManager from '../managers/EditorManager';
import type { AssetForEdit } from './AssetsType';
import type { AssetBlockEditorVM } from '../vm/AssetBlockEditorVM';
import type { ExtendedMenuListItem } from './MenuList';

type BlockControllerHolder = {
  type: string;
  definition: BlockTypeDefinition | null;
  controller: BlockEditorController | null;
};

export class EditorContextForAsset {
  private _asset: AssetFullInstanceR;
  private _resolvedBlocks!: ComputedRef<ResolvedAssetBlocks>;
  private _blockControllers = new Map<string, BlockControllerHolder>();
  protected assetBlockEditor: AssetBlockEditorVM | null = null;

  private constructor(
    public appManager: IAppManager,
    asset: AssetFullInstanceR,
  ) {
    this._asset = asset;
  }

  mountEditor(assetBlockEditor: AssetBlockEditorVM) {
    this.assetBlockEditor = assetBlockEditor;
    for (const controller_holder of this._blockControllers.values()) {
      if (controller_holder.controller) {
        controller_holder.controller.mountEditor(assetBlockEditor);
      }
    }
  }

  unmountEditor() {
    this.assetBlockEditor = null;
    for (const controller_holder of this._blockControllers.values()) {
      if (controller_holder.controller) {
        controller_holder.controller.unmountEditor();
      }
    }
  }
  getSelectedContentIds(): string[] {
    if (!this.assetBlockEditor) {
      return [];
    }
    let res: string[] = [];
    for (const [block_id, controller_holder] of this._blockControllers) {
      if (controller_holder.controller) {
        const selected_item_ids =
          controller_holder.controller.getSelectedContentItemIds();
        if (selected_item_ids.length > 0) {
          res = [
            ...res,
            ...selected_item_ids.map((item_id) => `${block_id}:${item_id}`),
          ];
        }
      }
    }
    return res;
  }

  setSelectedContentIds(ids: string[]): void {
    if (!this.assetBlockEditor) {
      return;
    }
    const res_ids_by_block = new Map<string, string[]>();
    for (const id of ids) {
      const parsed_id = id.match(/^(.*?):(.*)$/);
      if (parsed_id) {
        const res_ids = res_ids_by_block.get(parsed_id[1]);
        if (res_ids) res_ids.push(parsed_id[2]);
        else res_ids_by_block.set(parsed_id[1], [parsed_id[2]]);
      }
    }
    for (const [block_id, controller_holder] of this._blockControllers) {
      if (controller_holder && controller_holder.controller) {
        controller_holder.controller.setSelectedContentItemIds(
          res_ids_by_block.get(block_id) ?? [],
        );
      }
    }
  }

  getMountedAssetBlockEditor(): AssetBlockEditorVM | null {
    return this.assetBlockEditor;
  }

  get editingAssetId(): string {
    return this._asset.id;
  }

  get editingAsset(): AssetForEdit {
    const editor_manager = this.appManager.get(EditorManager);
    let asset: AssetForEdit = this._asset;
    if (editor_manager.activeEditor) {
      asset = editor_manager.activeEditor.applyAssetChanges(asset);
    }
    return asset;
  }

  get resolvedBlocks(): ResolvedAssetBlocks {
    return unref(this._resolvedBlocks);
  }

  async init() {
    await this._asset.resolveBlocks();
    this.updateBlockControllers();
  }

  static CreateInstance(
    appManager: IAppManager,
    asset: AssetFullInstanceR,
  ): EditorContextForAsset {
    const raw = new EditorContextForAsset(appManager, asset);
    const instance = reactive(raw);
    raw._resolvedBlocks = computed(() => {
      return calcResolvedBlocks(instance.editingAsset);
    });
    watch(
      () => instance.resolvedBlocks,
      () => {
        instance.updateBlockControllers();
      },
      {
        immediate: true,
      },
    );
    watch(
      () => {
        const editor_manager = raw.appManager.get(EditorManager);
        return editor_manager.activeEditor
          ? editor_manager.activeEditor.getAssetBlockEditorForAsset(
              instance.editingAsset.id,
            )
          : null;
      },
      (active_editor) => {
        if (active_editor) instance.mountEditor(active_editor);
        else instance.unmountEditor();
      },
      {
        immediate: true,
      },
    );
    return instance as EditorContextForAsset;
  }

  destroy() {}

  getContentItems(): BlockContentItem<any>[] {
    let content: BlockContentItem<any>[] = [];
    for (const block of this.resolvedBlocks.list) {
      const controller_holder = this._blockControllers.get(block.id);
      if (!controller_holder || !controller_holder.controller) {
        continue;
      }
      const block_content = controller_holder.controller.getContentItems();
      content = [...content, ...block_content];
    }
    return content;
  }

  getContentItemsMenu(
    block_id: string,
    items: BlockContentItem<any>[],
  ): ExtendedMenuListItem[] {
    const controller = this.getBlockController(block_id);
    return controller ? controller.getContentItemsMenu(items) : [];
  }

  getBlockController(block_id: string): BlockEditorController | null {
    const controller_holder = this._blockControllers.get(block_id);
    return controller_holder && controller_holder.controller
      ? controller_holder.controller
      : null;
  }

  updateBlockControllers() {
    const old_block_ids = new Set(this._blockControllers.keys());
    for (const [block_id, block] of Object.entries(
      this.resolvedBlocks.mapIds,
    )) {
      old_block_ids.delete(block_id);
      const exists_record = this._blockControllers.get(block_id);
      if (exists_record && exists_record.type === block.type) {
        continue;
      }
      const definition = this.appManager
        .get(EditorManager)
        .getBlockTypeDefinition(block.type);
      const controller = definition
        ? definition.createController(this.appManager, () => {
            return this.resolvedBlocks.mapIds[block.id] ?? null;
          })
        : null;
      this._blockControllers.set(block_id, {
        type: block.type,
        definition,
        controller,
      });
      const reactive_controller =
        this._blockControllers.get(block_id)?.controller;
      if (reactive_controller) {
        reactive_controller.postCreate();
      }
      if (this.assetBlockEditor && reactive_controller) {
        reactive_controller.mountEditor(this.assetBlockEditor);
      }
    }
    for (const old_block_id of old_block_ids) {
      const deleting_block_holder = this._blockControllers.get(old_block_id);
      if (deleting_block_holder) {
        if (deleting_block_holder.controller && this.assetBlockEditor) {
          deleting_block_holder.controller.unmountEditor();
        }
        this._blockControllers.delete(old_block_id);
      }
    }
  }
}
