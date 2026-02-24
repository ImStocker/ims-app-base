import type { IAppManager } from '../managers/IAppManager';
import type { ResolvedAssetBlock } from '../utils/assets';
import { BlockEditorController } from './BlockEditorController';
import type { BlockContentItem } from './BlockTypeDefinition';

export type ExternalPluginBlockEditorControllerDescriptor = {
  getContentItems: () => BlockContentItem<any>[];
};

export default class ExternalPluginBlockEditorController extends BlockEditorController {
  constructor(
    appManager: IAppManager,
    getResolvedBlock: () => ResolvedAssetBlock | null,
    private _getBlockControllerDescriptor: (
      resolvedBlock,
    ) => ExternalPluginBlockEditorControllerDescriptor,
  ) {
    super(appManager, getResolvedBlock);
  }

  get controllerDescriptor() {
    return this._getBlockControllerDescriptor(this.resolvedBlock);
  }

  override getContentItems(): BlockContentItem<any>[] {
    return this.controllerDescriptor.getContentItems();
  }
}
