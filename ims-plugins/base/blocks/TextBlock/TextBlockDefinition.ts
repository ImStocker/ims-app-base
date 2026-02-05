import type { BlockProvidedVariable } from '#logic/types/BlockTypeDefinition';
import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import type {
  AssetLocalizableField,
  ResolvedAssetBlock,
} from '#logic/utils/assets';
import { AssetPropType } from '#logic/types/Props';
import type { AssetFullInstanceR } from '#logic/types/AssetFullInstance';
import type { IAppManager } from '#logic/managers/IAppManager';
import { TextBlockController } from './TextBlockController';
import type { BlockEditorController } from '#logic/types/BlockEditorController';

export class TextBlockDefinition extends BlockTypeDefinition {
  name = 'text';
  component = async () => (await import('./TextBlock.vue')).default;
  icon = 'font-family';

  /*
  override getBlockContentItems(
    resolved_block: ResolvedAssetBlock,
  ): BlockContentItem[] {
    const anchors_list: BlockContentItem[] = [];
    if (resolved_block.title) {
      anchors_list.push({
        title: resolved_block.title,
        level: 1,
        anchor: getBlockAnchor(resolved_block),
        index: 1,
      });
    }

    const anchors = generateTextBlockAnchors(resolved_block);
    if (anchors) {
      anchors_list.push(...anchors);
    }

    return anchors_list;
  }*/

  override getBlockProvidedVariables(
    asset: AssetFullInstanceR,
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

  override getBlockLocalizableFields(
    asset: AssetFullInstanceR,
    resolved_block: ResolvedAssetBlock,
  ): AssetLocalizableField[] {
    const res: AssetLocalizableField[] = [];
    res.push({
      propKey: 'value',
      localeKey: 'value',
      title: resolved_block.title ?? resolved_block.name ?? 'Text',
      type: 'text',
    });
    return res;
  }

  override createController(
    appManager: IAppManager,
    getResolvedBlock: () => ResolvedAssetBlock | null,
  ): BlockEditorController {
    return new TextBlockController(appManager, getResolvedBlock);
  }
}
