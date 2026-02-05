import Inline from 'quill/blots/inline';
import type { AssetPropValueAsset } from '../../../logic/types/Props';

export const IMC_ASSET_BLOT_CLASS = 'ql-imc-asset';

export type ImcAssetBlotData = {
  value: AssetPropValueAsset;
  icon?: string;
};

export class ImcAssetBlot extends Inline {
  static override blotName = 'asset';
  static override tagName = 'a';
  static override className = IMC_ASSET_BLOT_CLASS;

  static override create(data: ImcAssetBlotData) {
    const node = super.create(data) as HTMLElement;
    ImcAssetBlot._applyFormat(node, data);
    return node;
  }

  private static _applyFormat(element: HTMLElement, data: ImcAssetBlotData) {
    element.dataset.assetId = data.value?.AssetId;
    element.dataset.assetTitle = data.value?.Title;
    element.dataset.assetIcon = data.icon ?? '';
    element.dataset.assetName = data.value?.Name ?? '';
    element.dataset.assetPid = data.value?.Pid ?? '';
    element.dataset.assetBlockId = data.value?.BlockId ?? '';
    element.dataset.assetAnchor = data.value?.Anchor ?? '';
    element.setAttribute('href', '#');
  }

  static override formats(element: HTMLElement): ImcAssetBlotData {
    const res: ImcAssetBlotData = {
      value: {
        AssetId: element.dataset.assetId ?? '',
        Title: element.dataset.assetTitle ?? '',
        Name: element.dataset.assetName ? element.dataset.assetName : null,
        BlockId: element.dataset.assetBlockId ?? null,
        Anchor: element.dataset.assetAnchor ?? null,
      },
    };
    if (element.dataset.assetPid) {
      res.value.Pid = element.dataset.assetPid;
    }
    if (element.dataset.assetIcon) {
      res.icon = element.dataset.assetIcon;
    }
    return res;
  }

  override format(name: string, value: ImcAssetBlotData) {
    if (name !== this.statics.blotName || !value) {
      super.format(name, value);
    } else {
      ImcAssetBlot._applyFormat(this.domNode, value);
    }
  }
}
