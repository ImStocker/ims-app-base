import type { IAppManager } from '../managers/IAppManager';
import type { ResolvedAssetBlock } from '../utils/assets';
import { BlockEditorController } from './BlockEditorController';
import type { BlockContentItem } from './BlockTypeDefinition';

export type ExternalPluginBlockControllerDescriptor = {
  getContentItems?: () => BlockContentItem<any>[];
};

export type GetPluginBlockController = (
  getResolvedBlock: () => ResolvedAssetBlock | null,
) => ExternalPluginBlockControllerDescriptor;

export default class ExternalPluginBlockEditorController extends BlockEditorController {
  private _pluginControllerDescriptor: ExternalPluginBlockControllerDescriptor;

  constructor(
    appManager: IAppManager,
    getResolvedBlock: () => ResolvedAssetBlock | null,
    getPluginController: GetPluginBlockController,
  ) {
    super(appManager, getResolvedBlock);
    this._pluginControllerDescriptor = getPluginController(getResolvedBlock);
  }

  override getContentItems(): BlockContentItem<any>[] {
    if (!this._pluginControllerDescriptor.getContentItems) {
      return super.getContentItems();
    }
    return this._pluginControllerDescriptor.getContentItems();
  }
}
