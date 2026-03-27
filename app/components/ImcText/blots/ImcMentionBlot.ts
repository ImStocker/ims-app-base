import Embed from 'quill/blots/embed';

export const IMC_MENTION_BLOT_CLASS = 'ql-imc-mention';

export type ImcMentionBlotData = {
  id: string;
  name: string;
  accountId: string;
};

export class ImcMentionBlot extends Embed {
  static override blotName = 'mention';
  static override tagName = 'span';
  static override className = IMC_MENTION_BLOT_CLASS;

  static override create(data: ImcMentionBlotData) {
    const node = super.create();
    ImcMentionBlot._applyFormat(node as HTMLElement, data);
    return node;
  }

  private static _applyFormat(element: HTMLElement, data: ImcMentionBlotData) {
    element.dataset.id = data.id;
    element.dataset.name = data.name;
    element.dataset.accountId = data.accountId;
  }

  static override value(element: HTMLElement): ImcMentionBlotData {
    const id = element.dataset.id ?? '';
    const name = element.dataset.name ?? '';
    const accountId = element.dataset.accountId ?? '';
    return {
      id,
      name,
      accountId,
    };
  }
}
