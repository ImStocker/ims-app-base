import { BlockEditorController } from '#logic/types/BlockEditorController';
import type { BlockContentItem } from '#logic/types/BlockTypeDefinition';
import type { IProjectContext } from '#logic/types/IProjectContext';
import type { ResolvedAssetBlock } from '#logic/utils/assets';

export type ExternalPluginBlockControllerDescriptor = {
  getContentItems?: () => BlockContentItem<any>[];
};

export type GetPluginBlockController = (
  getResolvedBlock: () => ResolvedAssetBlock | null,
) => ExternalPluginBlockControllerDescriptor;

export default class ExternalPluginBlockEditorController extends BlockEditorController {
  private _pluginControllerDescriptor: ExternalPluginBlockControllerDescriptor;

  constructor(
    projectContext: IProjectContext,
    getResolvedBlock: () => ResolvedAssetBlock | null,
    getPluginController: GetPluginBlockController,
  ) {
    super(projectContext, getResolvedBlock);
    this._pluginControllerDescriptor = getPluginController(getResolvedBlock);
  }

  override getContentItems(): BlockContentItem<any>[] {
    if (!this._pluginControllerDescriptor.getContentItems) {
      return super.getContentItems();
    }
    return this._pluginControllerDescriptor.getContentItems();
  }
}
