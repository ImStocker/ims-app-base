import { ColorAttributor } from 'quill/formats/color';
import { Scope } from 'parchment';

export class ImcColorAtrributor extends ColorAttributor {
  override add(node: HTMLElement, value: any): boolean {
    if (!this.canAdd(node, value)) {
      return false;
    }
    node.style.setProperty('--local-link-color', value);
    return super.add(node, value);
  }
  override remove(node: HTMLElement): void {
    node.style.removeProperty('--local-link-color');
    super.remove(node);
  }
}

export const ImcColorStyle = new ImcColorAtrributor('color', 'color', {
  scope: Scope.INLINE,
});
