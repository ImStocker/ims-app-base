import Embed from 'quill/blots/embed';
import {
  castAssetPropValueToString,
  type AssetPropValue,
} from '../../../logic/types/Props';

export const IMC_PROP_BLOT_CLASS = 'ql-imc-prop';

export type ImcPropBlotData = {
  value: AssetPropValue;
  inline: boolean;
};

export class ImcPropBlot extends Embed {
  static override blotName = 'prop';
  static override tagName = 'span';
  static override className = IMC_PROP_BLOT_CLASS;

  static override create(data: ImcPropBlotData) {
    const node = super.create();
    ImcPropBlot._applyFormat(node as HTMLElement, data);
    return node;
  }

  private static _applyFormat(element: HTMLElement, data: ImcPropBlotData) {
    element.dataset.inline = data.inline ? '1' : '';
    element.dataset.value = JSON.stringify(data.value);
    element.innerText = castAssetPropValueToString(data.value);
  }

  static override value(element: HTMLElement): ImcPropBlotData {
    let value: AssetPropValue = null;
    try {
      value = JSON.parse(element.dataset.value ?? 'null');
    } catch {
      // Do nothing
    }
    return {
      value,
      inline: element.dataset.inline === '1',
    };
  }
}
