import Embed from 'quill/blots/embed';

export const IMC_ICON_BLOT_CLASS = 'ql-imc-icon';

export type ImcIconBlotData = string;

export class ImcIconBlot extends Embed {
  static override blotName = 'icon';
  static override tagName = 'span';
  static override className = IMC_ICON_BLOT_CLASS;

  static override create(data: ImcIconBlotData) {
    const node = super.create();
    ImcIconBlot._applyFormat(node as HTMLElement, data);
    return node;
  }

  private static _applyFormat(element: HTMLElement, data: ImcIconBlotData) {
    element.innerHTML = '<i></i>';
    const i = element.querySelector('i');
    if (i) i.className = 'asset-icon-' + data;
  }

  static override value(element: HTMLElement): ImcIconBlotData {
    const i = element.querySelector('i');
    return i ? i.className.replace(/^asset-icon-/, '') : '';
  }
}
