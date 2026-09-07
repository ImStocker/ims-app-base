import { BlockEditorController } from '#logic/types/BlockEditorController';
import type { BlockContentItem } from '#logic/types/BlockTypeDefinition';
import { extractHeaderAnchorsFromMarkdown } from '#logic/utils/assets';

export class MarkdownBlockController extends BlockEditorController {
  override getContentItems(): BlockContentItem<any>[] {
    const anchors_list: BlockContentItem<void>[] = [];
    if (this.resolvedBlock) {
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
      if (typeof value === 'string') {
        const headers = extractHeaderAnchorsFromMarkdown(value);
        for (const header of headers) {
          anchors_list.push({
            ...header,
            itemId: 'h-' + header.anchor,
            blockId: this.resolvedBlock.id,
          });
        }
      }
    }
    return anchors_list;
  }
}
