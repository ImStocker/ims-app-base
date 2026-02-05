import type { IAppManager } from '../managers/IAppManager';
import type { ResolvedAssetBlock } from '../utils/assets';
import type { BlockContentItem } from './BlockTypeDefinition';
import { assert } from '../utils/typeUtils';
import type { AssetBlockEditorVM } from '../vm/AssetBlockEditorVM';
import type { IAssetBlockComponent } from './IAssetBlockComponent';
import type { ExtendedMenuListItem } from './MenuList';

export abstract class BlockEditorController {
  protected assetBlockEditor: AssetBlockEditorVM | null = null;

  constructor(
    public appManager: IAppManager,
    public getResolvedBlock: () => ResolvedAssetBlock | null,
  ) {}

  postCreate() {}

  mountEditor(assetBlockEditor: AssetBlockEditorVM) {
    this.assetBlockEditor = assetBlockEditor;
  }

  unmountEditor() {
    this.assetBlockEditor = null;
  }

  getSelectedContentItemIds(): string[] {
    return [];
  }

  setSelectedContentItemIds(_itemIds: string[]): void {}

  getMountedBlockComponent<
    Component extends IAssetBlockComponent,
  >(): Component | null {
    if (this.assetBlockEditor) {
      return this.assetBlockEditor.getBlockMountedComponent<Component>(
        this.resolvedBlock.id,
      );
    }
    return null;
  }

  get resolvedBlock() {
    const block = this.getResolvedBlock();
    assert(block);
    return block;
  }

  getContentItems(): BlockContentItem<any>[] {
    if (!this.resolvedBlock.title) {
      return [];
    }
    return [
      {
        blockId: this.resolvedBlock.id,
        itemId: 'header',
        title: this.resolvedBlock.title,
        level: 1,
        anchor: '',
        index: 1,
      },
    ];
  }

  getContentItemsMenu(_items: BlockContentItem<any>[]): ExtendedMenuListItem[] {
    return [];
  }
}

export class DefaultBlockEditorController extends BlockEditorController {}
