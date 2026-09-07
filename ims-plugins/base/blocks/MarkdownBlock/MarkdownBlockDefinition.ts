import type { IAppManager } from '#logic/managers/IAppManager';
import type { BlockEditorController } from '#logic/types/BlockEditorController';
import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import { MarkdownBlockController } from './MarkdownBlockController';
import { markdownBlockAiSpec } from './MarkdownBlockAiSpec';

export class MarkdownBlockDefinition extends BlockTypeDefinition {
  name = 'markdown';
  component = async () => (await import('./MarkdownBlock.vue')).default;
  icon = 'markdown-line';

  override focusOnAdded = true;
  override aiSpec = markdownBlockAiSpec.aiSpec;

  override createController(
    appManager: IAppManager,
    getResolvedBlock: () => ResolvedAssetBlock | null,
  ): BlockEditorController {
    return new MarkdownBlockController(appManager, getResolvedBlock);
  }
}
