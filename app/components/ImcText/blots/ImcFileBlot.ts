import Embed from 'quill/blots/embed';
import type { AssetPropValueFile } from '../../../logic/types/Props';

export const IMC_FILE_BLOT_CLASS = 'ql-imc-file';

export type ImcFileBlotData = {
  value: AssetPropValueFile;
  inline: boolean;
  width: number | null;
  height: number | null;
  href?: string | null;
};

export class ImcFileBlot extends Embed {
  static override blotName = 'file';
  static override tagName = 'span';
  static override className = IMC_FILE_BLOT_CLASS;

  static override create(data: ImcFileBlotData) {
    const node = super.create();
    ImcFileBlot._applyFormat(node as HTMLElement, data);
    return node;
  }

  private static _applyFormat(element: HTMLElement, data: ImcFileBlotData) {
    element.dataset.inline = data.inline ? '1' : '';
    if (data.value) {
      element.dataset.fileId = data.value.FileId;
      element.dataset.dir = data.value.Dir ?? '';
      element.dataset.store = data.value.Store;
      element.dataset.size = `${data.value.Size}`;
      element.dataset.title = data.value.Title;
    }
    element.innerHTML = '<span class="loaderDots"><i></i><i></i><i></i></span>';
    element.dataset.width = `${data.width}`;
    element.dataset.height = `${data.height}`;
  }

  static override value(element: HTMLElement): ImcFileBlotData {
    const size = parseInt(element.dataset.size ?? '0');
    const height = parseInt(element.dataset.height ?? '0');
    const width = parseInt(element.dataset.width ?? '0');

    return {
      value: {
        FileId: element.dataset.fileId ?? '',
        Dir: element.dataset.dir ? element.dataset.dir : null,
        Store: element.dataset.store ?? '',
        Size: !isNaN(size) ? size : 0,
        Title: element.dataset.title ?? '',
      },
      inline: element.dataset.inline === '1',
      height: !isNaN(height) ? height : null,
      width: !isNaN(width) ? width : null,
    };
  }
}
