import type { EditorView, ViewUpdate } from '@codemirror/view';
import { ViewPlugin } from '@codemirror/view';

export function blurHandler(onBlur: () => void) {
  const extension = ViewPlugin.fromClass(
    class {
      constructor(private _view: EditorView) {}
      update(update: ViewUpdate) {
        if (update.focusChanged && !update.view.hasFocus) {
          onBlur();
        }
      }
    },
  );
  return [
    {
      type: 'default',
      value: extension,
    },
  ];
}
