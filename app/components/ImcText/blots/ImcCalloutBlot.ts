import Block from 'quill/blots/block';

export const ImcCalloutBlotTypes = {
  info: {
    type: 'info',
    toolbarIcon: 'ri-information-2-line',
    icon: 'ri-information-2-fill',
  },
  warning: {
    type: 'warning',
    toolbarIcon: 'ri-alert-line',
    icon: 'ri-alert-fill',
  },
  solution: {
    type: 'solution',
    toolbarIcon: 'ri-checkbox-circle-line',
    icon: 'ri-checkbox-circle-fill',
  },
  error: {
    type: 'error',
    toolbarIcon: 'ri-error-warning-line',
    icon: 'ri-error-warning-fill',
  },
} as const;

export type ImcCalloutBlotType = keyof typeof ImcCalloutBlotTypes;

class ImcCalloutItem extends Block {
  static override create(value: ImcCalloutBlotType): HTMLElement {
    const node = super.create(value) as HTMLElement;
    node.setAttribute('data-type', value);
    return node;
  }

  static override formats(domNode: HTMLElement) {
    return domNode.getAttribute('data-type') || undefined;
  }

  override format(name: string, value: any): void {
    if (name === this.statics.blotName && value) {
      this.domNode.setAttribute('data-type', value);
    } else {
      super.format(name, value);
    }
  }
}

ImcCalloutItem.blotName = 'callout';
ImcCalloutItem.tagName = 'P';
ImcCalloutItem.className = 'ql-callout';

export { ImcCalloutItem };
