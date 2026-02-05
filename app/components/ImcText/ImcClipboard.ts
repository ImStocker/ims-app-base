import Quill from 'quill';
import Clipboard from 'quill/modules/clipboard';
import type { Range } from 'quill/core/selection.js';
import Delta from 'quill-delta';
import tinycolor from 'tinycolor2';

export class ImcClipboard extends Clipboard {
  override onPaste(
    range: Range,
    { text, html }: { text?: string; html?: string },
  ) {
    const formats = this.quill.getFormat(range.index);
    const pastedDelta = this.convert({ text, html }, formats);
    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .concat(pastedDelta);
    delta.forEach((op: any) => {
      if (op.attributes && op.attributes.background) {
        delete op.attributes.background;
      }
      if (op.attributes && op.attributes.color) {
        const color = tinycolor(op.attributes.color);
        if (color.getLuminance() > 0.9 || color.getLuminance() < 0.1) {
          delete op.attributes.color;
        }
      }
      if (op.attributes && Object.keys(op.attributes).length === 0) {
        delete op.attributes;
      }
    });

    this.quill.updateContents(delta, Quill.sources.USER);
    // range.length contributes to delta.length()
    this.quill.setSelection(
      delta.length() - range.length,
      Quill.sources.SILENT,
    );
    this.quill.scrollSelectionIntoView();
  }
}
