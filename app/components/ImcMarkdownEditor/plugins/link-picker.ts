import { type EditorView, type ViewUpdate, ViewPlugin } from '@codemirror/view';

export type LinkPickerOpenRequest = {
  view: EditorView;
  rect: { left: number; top: number; right: number; bottom: number };
  anchorPos: number;
  query: string;
};

// Watches the document and reports whenever the caret sits at the end of a
// wiki-link prefix `[[<query>`. The host component opens its link picker at
// the caret position and keeps the search query in sync. Returns `null` when
// the caret is no longer inside a wiki-link prefix, which the host uses to
// close the picker.
//
// Note: the caret coordinates are measured with `requestMeasure`, because
// `coordsAtPos` reads the editor layout and is not allowed during an update.
export function linkPickerTrigger(
  onChange: (request: LinkPickerOpenRequest | null) => void,
) {
  const trigger = ViewPlugin.fromClass(
    class {
      constructor(private view: EditorView) {}

      update(update: ViewUpdate) {
        if (!update.docChanged && !update.selectionSet) return;

        const sel = update.state.selection.main;
        if (!sel.empty) {
          onChange(null);
          return;
        }

        const doc = update.state.doc;
        const before = doc.sliceString(0, sel.from);
        const match = before.match(/\[\[[^\]|\n[]*$/);
        if (!match) {
          onChange(null);
          return;
        }

        const anchorPos = sel.from - match[0].length;
        const query = match[0].slice(2);
        const caretPos = sel.from;

        this.view.requestMeasure({
          read: () => {
            const caret_rect = this.view.coordsAtPos(caretPos);
            if (!caret_rect) return null;
            return {
              left: caret_rect.left,
              top: caret_rect.bottom,
              right: caret_rect.right,
              bottom: caret_rect.bottom,
            };
          },
          write: (rect) => {
            if (!rect) {
              onChange(null);
              return;
            }
            onChange({
              view: this.view,
              rect,
              anchorPos,
              query,
            });
          },
        });
      }
    },
  );

  return [{ type: 'default' as const, value: trigger }];
}
