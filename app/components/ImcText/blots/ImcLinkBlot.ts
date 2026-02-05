import Link from 'quill/formats/link';

Link.PROTOCOL_WHITELIST = ['http', 'https', 'mailto', 'tel', 'sms', 'project'];

export class ImcLinkBlot extends Link {
  static override create(value: string) {
    const node = super.create(value) as HTMLElement;
    node.setAttribute('title', this.sanitize(value));
    return node;
  }

  override format(name: string, value: unknown) {
    if (name !== this.statics.blotName || !value) {
      super.format(name, value);
    } else {
      super.format(name, value);
      this.domNode.setAttribute('title', Link.sanitize(value as string));
    }
  }
}
