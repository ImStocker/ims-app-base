import type Toolbar from 'quill/modules/toolbar';
import BubbleTheme from 'quill/themes/bubble';

export class ImcBubble extends BubbleTheme {
  override extendToolbar(_toolbar: Toolbar): void {}
  destroy() {}
}
