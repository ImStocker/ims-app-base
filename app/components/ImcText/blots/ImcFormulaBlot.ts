import Embed from 'quill/blots/embed';

export const IMC_FORMULA_BLOT_CLASS = 'ql-imc-formula';

export type ImcFormulaBlotData = string;

export class ImcFormulaBlot extends Embed {
  static override blotName = 'formula';
  static override tagName = 'span';
  static override className = IMC_FORMULA_BLOT_CLASS;

  static override create(data: ImcFormulaBlotData) {
    const node = super.create();
    ImcFormulaBlot._applyFormat(node as HTMLElement, data);
    return node;
  }

  private static _applyFormat(element: HTMLElement, data: ImcFormulaBlotData) {
    element.dataset.value = data;
    element.innerText = data;
  }

  static override value(element: HTMLElement): ImcFormulaBlotData {
    return element.dataset.value ?? '';
  }
}
