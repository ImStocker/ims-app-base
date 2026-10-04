import type { AssetFullInstanceR } from '#logic/types/AssetFullInstance';
import type { IAppManager } from '#logic/managers/IAppManager';
import type { BlockEditorController } from '#logic/types/BlockEditorController';
import {
  BlockTypeDefinition,
  type BlockProvidedVariable,
} from '#logic/types/BlockTypeDefinition';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import { AssetPropType } from '#logic/types/Props';
import { MarkdownBlockController } from './MarkdownBlockController';
import { markdownBlockAiSpec } from './MarkdownBlockAiSpec';

export class MarkdownBlockDefinition extends BlockTypeDefinition {
  name = 'markdown';
  component = async () => (await import('./MarkdownBlock.vue')).default;
  icon = 'font-family';
  override group = null;
  override index = 1;

  override focusOnAdded = true;
  override aiSpec = markdownBlockAiSpec.aiSpec;

  // Same contract as TextBlockDefinition: exposes the body as the `value` field.
  override getBlockProvidedVariables(
    _asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
    _app_manager: IAppManager,
  ): BlockProvidedVariable[] {
    if (!resolved_block.name && !resolved_block.title) return [];
    return [
      {
        blockId: resolved_block.id,
        blockName: resolved_block.name,
        dataType: [
          {
            Type: AssetPropType.TEXT,
          },
        ],
        field: {
          differentDefinition: false,
          index: 0,
          multiple: false,
          params: {},
          propKey: 'value',
          propTitle: resolved_block.title ?? resolved_block.name ?? 'Text',
          propName: 'value',
          type: 'text',
        },
        name: resolved_block.name
          ? resolved_block.name
          : (resolved_block.title ?? ''),
        title: resolved_block.title
          ? resolved_block.title
          : (resolved_block.name ?? ''),
      },
    ];
  }

  override createController(
    appManager: IAppManager,
    getResolvedBlock: () => ResolvedAssetBlock | null,
  ): BlockEditorController {
    return new MarkdownBlockController(appManager, getResolvedBlock);
  }
}
