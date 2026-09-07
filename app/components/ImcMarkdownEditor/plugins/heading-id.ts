import {
  Decoration,
  type ViewUpdate,
  type EditorView,
  ViewPlugin,
  type DecorationSet,
} from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';

import { syntaxTree } from '@codemirror/language';
import {
  generateTextHeaderAnchor,
  makeAnchorTagId,
} from '../../../logic/utils/assets';

// const headingIdPlugin = ViewPlugin.fromClass(
//   class {
//     constructor(private _view: EditorView) {}

//     update(update: ViewUpdate) {
//       if (!update.docChanged) return;

//       const builder: any[] = [];

//       syntaxTree(update.state).iterate({
//         enter: (node) => {
//           if (node.name === 'ATXHeading1') {
//             const line = this._view.state.doc.lineAt(node.from);

//             // Extract heading text (skip ###)
//             const text = line.text.replace(/^#+\s*/, '');
//             const id = '123';

//             builder.push(
//               Decoration.line({
//                 attributes: { id },
//               }).range(line.from),
//             );
//           }
//         },
//       });

//       return Decoration.set(builder);
//     }
//   },
// );
export interface HeadingIdConfig {
  blockId?: string;
  onView?: (view: EditorView | null) => void;
}

export interface HeadingAnchorRef {
  anchor: string;
  from: number;
}

// Walks the syntax tree for headings and produces their anchors in document
// order, applying the same generateTextHeaderAnchor dedup the decorations use.
// Used both by the id decoration builder and by scroll navigation.
export function getHeadingAnchors(state: EditorState): HeadingAnchorRef[] {
  const headers: HeadingAnchorRef[] = [];
  const used_anchors = new Set<string>();

  syntaxTree(state).iterate({
    enter: (ctx) => {
      if (
        ctx.name.startsWith('ATXHeading') ||
        ctx.name.startsWith('SetextHeading')
      ) {
        let header_text = '';

        if (ctx.name.startsWith('ATXHeading')) {
          const cursor_to = ctx.to;
          const cursor_from = ctx.node.firstChild!.to;
          header_text = state.doc.sliceString(cursor_from, cursor_to);
        } else {
          const cursor_from = ctx.from;
          const cursor_to = ctx.node.firstChild!.from;
          header_text = state.doc.sliceString(cursor_from, cursor_to);
        }

        header_text = header_text.trim();

        if (!header_text) return;

        const anchor = generateTextHeaderAnchor(header_text, used_anchors);
        used_anchors.add(anchor);

        headers.push({ anchor, from: ctx.from });
      }
    },
  });

  return headers;
}

const headingIdPlugin = (config: HeadingIdConfig) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(private view: EditorView) {
        // начальная отрисовка
        this.decorations = this.buildDecorations();
        config.onView?.(this.view);
      }

      destroy() {
        config.onView?.(null);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          syntaxTree(update.state) !== syntaxTree(update.startState)
        ) {
          this.decorations = this.buildDecorations();
        }
      }

      private buildDecorations(): DecorationSet {
        const builder: Range<Decoration>[] = [];

        for (const { anchor, from } of getHeadingAnchors(this.view.state)) {
          const line = this.view.state.doc.lineAt(from);

          // The bare slug keeps in-editor `[[#slug]]` navigation working
          // (querySelector by data-md-header-anchor). The canonical anchor
          // tag id (bid-<block>~h-<slug>) is what the asset page contents
          // table / scroll spy resolve via getElementById.
          const attributes: Record<string, string> = {
            'data-md-header-anchor': anchor,
          };
          attributes['id'] = config.blockId
            ? makeAnchorTagId(config.blockId, 'h-' + anchor)
            : anchor;

          builder.push(
            Decoration.line({
              attributes,
            }).range(line.from),
          );
        }

        return Decoration.set(builder, true);
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );

export function headingId(config: HeadingIdConfig = {}) {
  return [
    {
      type: 'default',
      value: headingIdPlugin(config),
    },
  ];
}
