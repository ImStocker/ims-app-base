import type { BlockContentItem } from '#logic/types/BlockTypeDefinition';
import { extractHeaderAnchorsFromText } from '#logic/utils/assets';
import { BlockEditorController } from '#logic/types/BlockEditorController';
import {
  AssetPropType,
  getAssetPropType,
  type AssetPropValueText,
} from '#logic/types/Props';

export class TextBlockController extends BlockEditorController {
  override getContentItems(): BlockContentItem<void>[] {
    const anchors_list: BlockContentItem<void>[] = [];
    if (this.resolvedBlock.title) {
      anchors_list.push({
        blockId: this.resolvedBlock.id,
        itemId: 'header',
        title: this.resolvedBlock.title,
        level: 1,
        anchor: '',
        index: 1,
      });
    }

    const value = this.resolvedBlock.computed['value'];
    if (getAssetPropType(value) === AssetPropType.TEXT) {
      const headers = extractHeaderAnchorsFromText(value as AssetPropValueText);
      for (const header of headers) {
        anchors_list.push({
          ...header,
          itemId: 'h-' + header.anchor,
          blockId: this.resolvedBlock.id,
        });
      }
    }
    return anchors_list;
  }
}
