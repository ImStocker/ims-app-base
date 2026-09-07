import { type EditorView, type ViewUpdate, ViewPlugin } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

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
  const isInsideExistingWikiLink = (state: EditorState, anchorPos: number) => {
    let inside = false;
    syntaxTree(state).iterate({
      enter: (ref) => {
        if (inside || ref.name !== 'WikiLink') return;
        if (ref.from !== anchorPos) return;
        const content = state.doc.sliceString(ref.from + 2, ref.to - 2);
        if (content.includes('|')) inside = true;
      },
    });
    return inside;
  };

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

        // Do not open the picker when editing an already-inserted wiki link
        // (`[[address|label]]` — its content already contains the `|`).
        if (isInsideExistingWikiLink(update.state, anchorPos)) {
          onChange(null);
          return;
        }

        // A pure caret move (clicking back into a link, arrow keys) may close
        // the picker but never reopen it — only typing `[[` opens it.
        if (!update.docChanged) return;

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
