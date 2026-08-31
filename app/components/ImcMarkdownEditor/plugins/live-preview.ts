import {
  Decoration,
  ViewPlugin,
  WidgetType,
  EditorView,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import {
  StateField,
  type EditorState,
  type Range,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import katex from 'katex';

// Decorates a markdown marker (e.g. `**`, `#`, `>`, `-`, backticks, link
// brackets) so it is visually hidden unless the cursor is inside the construct
// it belongs to. The document text is never changed, so editing/cursor keep
// working exactly as in raw source.
const hideMark = Decoration.mark({ class: 'cm-md-mark-hidden' });

// Syntax-tree node names that represent pure *markup* (no semantic content).
// For each we look at its owning construct and hide the marker when that
// construct is not "active".
//
// Block-level markers reveal whenever the cursor is on the (line of the)
// construct: headings `#`, blockquote `>`, list `-`/`*`.
const LINE_MARK_NODES = new Set([
  'HeaderMark', // `#`
  'QuoteMark', // `>`
  'ListMark', // `-`, `*`, `1.`
]);

// Inline markers reveal only when the cursor is *inside* the construct span
// (Obsidian keeps `**bold**` rendered until you place the caret within it),
// not merely anywhere on the same line:
//   xx|x bold xxxx   ->  xx bold xxxx        (markers stay hidden)
//   xx **b|old** xxxx -> xx **b|old** xxxx   (markers revealed)
const INLINE_MARK_NODES = new Set([
  'EmphasisMark', // `*`, `_` (also the marks of `**`/`__`)
  'CodeMark', // backticks (inline + fenced)
  'LinkMark', // `[`, `]`, `(`, `)`
  'URL', // link/image target
]);

// `==highlight==` and `~~strike~~` are not parsed by CodeMirror's markdown
// grammar, so their delimiters are hidden via a regex fallback (the inner text
// is already styled by mark-styles.ts). Lookarounds avoid matching `===`/`~~~`
// (setext/horizontal-rule) and nested delimiters.
const highlightDelim = /(==)([^=\n]+?)==/g;
const strikeDelim = /(~~)([^~\n]+?)~~/g;

// Line-level styling classes (Obsidian-style chrome for the rendered block).
const LINE_BLOCKQUOTE = 'cm-md-line-blockquote';
const LINE_LIST = 'cm-md-line-list';
const LINE_HR = 'cm-md-line-hr';
const GAP_LINE = 'cm-md-list-gap';

const COPY_ICON_CLASS = 'ri-file-copy-line';
const CHECK_ICON_CLASS = 'ri-check-line';

// Builds the copy button shared by the code header widget. It intercepts its
// own clicks so the editor never shifts the caret into the block (which would
// reveal the raw source / drop the widget).
function buildCopyButton(code: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'cm-md-code-copy';
  btn.type = 'button';
  btn.title = 'Copy code';
  const icon = document.createElement('i');
  icon.className = `ri ${COPY_ICON_CLASS}`;
  btn.appendChild(icon);
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      icon.className = `ri ${CHECK_ICON_CLASS}`;
      setTimeout(() => {
        icon.className = `ri ${COPY_ICON_CLASS}`;
      }, 1500);
    } catch {
      /* ignore */
    }
  });
  return btn;
}

// Renders the fenced code block's header in live preview: the language label
// plus a copy button, shown side by side on the opening fence line (replacing
// the raw `CodeInfo` text) while the caret is outside the block.
class CodeLangWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly code: string,
  ) {
    super();
  }

  override eq(other: CodeLangWidget): boolean {
    return other.lang === this.lang && other.code === this.code;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-md-code-tools';

    const lang = document.createElement('span');
    lang.className = 'cm-md-code-lang';
    lang.textContent = this.lang;
    wrap.appendChild(lang);

    wrap.appendChild(buildCopyButton(this.code));

    return wrap;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

// Standalone copy button used when the fenced code block has no language, so
// a copy affordance is still available next to the opening fence.
class CodeCopyWidget extends WidgetType {
  constructor(readonly code: string) {
    super();
  }

  override eq(other: CodeCopyWidget): boolean {
    return other.code === this.code;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-md-code-tools';
    wrap.appendChild(buildCopyButton(this.code));
    return wrap;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

// Renders a `$...$` / `$$...$$` formula with KaTeX in live preview.
class MathWidget extends WidgetType {
  constructor(
    readonly tex: string,
    readonly display: boolean,
  ) {
    super();
  }

  override eq(other: MathWidget): boolean {
    return other.tex === this.tex && other.display === this.display;
  }

  override toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-md-math-render';
    try {
      span.innerHTML = katex.renderToString(this.tex, {
        displayMode: this.display,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch {
      span.textContent = this.tex;
    }
    return span;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

// Renders `<sub>` / `<sup>` inline HTML as a real subscript / superscript.
class SubSupWidget extends WidgetType {
  constructor(
    readonly tag: 'sub' | 'sup',
    readonly content: string,
  ) {
    super();
  }

  override eq(other: SubSupWidget): boolean {
    return other.tag === this.tag && other.content === this.content;
  }

  override toDOM(): HTMLElement {
    const el = document.createElement(this.tag);
    el.textContent = this.content;
    return el;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

// Renders a fenced `` ```mermaid`` code block as a diagram image in live
// preview. The diagram is generated locally with the `mermaid` package, which
// is loaded on demand; the raw source stays editable by placing the caret
// inside the block (the widget is dropped while the selection overlaps it).
let mermaidWidgetSeq = 0;

// `document.body` carries the IMS theme (`ims-dark` / `ims-light`), which
// drives which mermaid color scheme the diagram is rendered with.
function mermaidTheme(): 'dark' | 'default' {
  return document.body.getAttribute('data-theme') === 'ims-dark'
    ? 'dark'
    : 'default';
}

class MermaidWidget extends WidgetType {
  private themeObserver: MutationObserver | null = null;
  private renderSeq = 0;

  constructor(readonly code: string) {
    super();
  }

  override eq(other: MermaidWidget): boolean {
    return other.code === this.code;
  }

  override toDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-md-mermaid-render';
    const loading = document.createElement('span');
    loading.className = 'cm-md-mermaid-loading';
    loading.textContent = 'Loading diagram…';
    container.appendChild(loading);
    void this.renderDiagram(container);
    // The widget instance is reused while the document is unchanged, so no
    // decoration rebuild happens on a theme toggle; re-render in place.
    if (!this.themeObserver) {
      this.themeObserver = new MutationObserver(() =>
        this.renderDiagram(container),
      );
      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }
    return container;
  }

  override destroy() {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
  }

  private async renderDiagram(container: HTMLElement) {
    const seq = ++this.renderSeq;
    try {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        theme: mermaidTheme(),
        themeVariables: {
          background: 'transparent',
        },
      });
      const { svg } = await mermaid.render(
        'cm-md-mermaid-' + mermaidWidgetSeq++,
        this.code,
      );
      if (seq !== this.renderSeq) return;
      container.replaceChildren();
      const holder = document.createElement('div');
      holder.className = 'cm-md-mermaid-svg';
      holder.innerHTML = svg;
      container.appendChild(holder);
    } catch (err) {
      if (seq !== this.renderSeq) return;
      container.replaceChildren();
      const errEl = document.createElement('div');
      errEl.className = 'cm-md-mermaid-error';
      errEl.textContent =
        err instanceof Error
          ? err.message
          : String(err ?? 'Mermaid render failed');
      container.appendChild(errEl);
    }
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

export function livePreview() {
  // A multi-line replace (fenced mermaid diagram → image) may only be provided
  // as a static decoration (state field), not through a plugin's `decorations`,
  // so both the marker/layout plugin and the mermaid state field are returned.
  return [livePreviewPlugin, mermaidDecorations];
}

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = build(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = build(update.view);
      }
    }
  },
  {
    decorations: (inst) => inst.decorations,
  },
);

// Builds the multi-line replace decorations that swap fenced `mermaid` blocks
// for a rendered diagram. Plugins may not emit replaces crossing line breaks,
// so this lives in a StateField exposed through the (static) `decorations`
// facet. The block is only replaced while the caret stays outside it; placing
// the caret inside reveals the raw source for editing.
function buildMermaidDecorations(state: EditorState): DecorationSet {
  const doc = state.doc;
  const sels = state.selection.ranges;
  const ranges: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter: (ref) => {
      if (ref.name !== 'FencedCode') return;
      const infoNode = ref.node.getChild('CodeInfo');
      const lang = infoNode
        ? doc.sliceString(infoNode.from, infoNode.to).trim()
        : '';
      if (lang.split(/\s+/)[0]?.toLowerCase() !== 'mermaid') return;
      if (sels.some((r) => r.from <= ref.to && r.to >= ref.from)) return;

      const codeNode = ref.node.getChild('CodeText');
      const code = codeNode
        ? doc.sliceString(codeNode.from, codeNode.to)
        : doc
            .sliceString(ref.from, ref.to)
            .replace(/^[^\n]*\n/, '')
            .replace(/\n[ \t]*```[ \t]*$/, '');
      ranges.push(
        Decoration.replace({ widget: new MermaidWidget(code) }).range(
          ref.from,
          ref.to,
        ),
      );
    },
  });

  return Decoration.set(ranges, true);
}

const mermaidDecorations = StateField.define<DecorationSet>({
  create(state) {
    return buildMermaidDecorations(state);
  },
  update(value, tr) {
    if (!tr.docChanged && !tr.selection) return value.map(tr.changes);
    return buildMermaidDecorations(tr.state);
  },
  provide: (field) => EditorView.decorations.from(field),
});

function build(view: EditorView): DecorationSet {
  const doc = view.state.doc;
  const tree = syntaxTree(view.state);
  const markRanges: Range<Decoration>[] = [];
  const widgetRanges: Range<Decoration>[] = [];
  const lineClasses = new Map<number, Set<string>>();
  const listItemLines = new Set<number>();

  const sel = view.state.selection.ranges;

  // Lines touched by any selection are "active" (Obsidian reveals the whole
  // line the cursor is on).
  const activeLines = new Set<number>();
  for (const r of sel) {
    const start = doc.lineAt(r.from).number;
    const end = doc.lineAt(r.to).number;
    for (let l = start; l <= end; l++) activeLines.add(l);
  }
  const overlaps = (a: number, b: number) =>
    sel.some((r) => r.from <= b && r.to >= a);

  const addLineClass = (from: number, to: number, cls: string) => {
    const first = doc.lineAt(from).number;
    const last = doc.lineAt(to).number;
    for (let l = first; l <= last; l++) {
      const pos = doc.line(l).from;
      let set = lineClasses.get(pos);
      if (!set) {
        set = new Set<string>();
        lineClasses.set(pos, set);
      }
      set.add(cls);
    }
  };

  for (const vr of view.visibleRanges) {
    tree.iterate({
      from: vr.from,
      to: vr.to,
      enter: (ref) => {
        const name = ref.name;

        // Fenced `mermaid` blocks are replaced with a rendered diagram by the
        // `mermaidDecorations` state field (multi-line replace decorations are
        // not allowed from plugin decorations). Skip the fence's internals so
        // the background backtick hiding / language chip don't overlap the
        // replace: while the caret is outside the block the replace hides it,
        // and while editing, the raw source stays fully visible.
        if (name === 'FencedCode') {
          const infoNode = ref.node.getChild('CodeInfo');
          const lang = infoNode
            ? view.state.doc.sliceString(infoNode.from, infoNode.to).trim()
            : '';
          if (lang.split(/\s+/)[0]?.toLowerCase() === 'mermaid') {
            return false;
          }
          // No language: still offer a copy button on the opening fence when
          // the caret is outside the block (preview mode). With a language, the
          // `CodeInfo` branch renders the combined lang + copy header instead.
          if (!lang && !overlaps(ref.from, ref.to)) {
            const codeNode = ref.node.getChild('CodeText');
            const code = codeNode
              ? view.state.doc.sliceString(codeNode.from, codeNode.to)
              : '';
            widgetRanges.push(
              Decoration.widget({
                widget: new CodeCopyWidget(code),
                side: -1,
              }).range(ref.from),
            );
          }
        }

        // Track the lines covered by list items so we can draw the connecting
        // guide line on the *empty* line between two items (Obsidian-style).
        if (name === 'ListItem') {
          const a = doc.lineAt(ref.from).number;
          const b = doc.lineAt(ref.to).number;
          for (let l = a; l <= b; l++) listItemLines.add(l);
        }

        // ---- line-level chrome (always on in live preview) ----
        if (name === 'Blockquote') {
          addLineClass(ref.from, ref.to, LINE_BLOCKQUOTE);
        } else if (
          name === 'ListItem' ||
          name === 'BulletList' ||
          name === 'OrderedList'
        ) {
          addLineClass(ref.from, ref.to, LINE_LIST);
        } else if (name === 'HorizontalRule') {
          // Render a rule only when the cursor is NOT on the line; otherwise
          // reveal the raw `---`/`***` so it can be edited.
          if (!activeLines.has(doc.lineAt(ref.from).number)) {
            if (ref.from < ref.to) {
              markRanges.push(hideMark.range(ref.from, ref.to));
            }
            addLineClass(ref.from, ref.to, LINE_HR);
          }
          return;
        } else if (name === 'CodeInfo') {
          // Show the language chip + copy button only when the caret is
          // *outside* the fenced block (preview mode). Inside the block the
          // raw text stays visible so the user can edit it.
          const owner = ref.node.parent;
          if (!owner || overlaps(owner.from, owner.to)) return;
          const lang = view.state.doc.sliceString(ref.from, ref.to);
          if (lang) {
            const codeNode = owner.getChild('CodeText');
            const code = codeNode
              ? view.state.doc.sliceString(codeNode.from, codeNode.to)
              : '';
            widgetRanges.push(
              Decoration.replace({
                widget: new CodeLangWidget(lang, code),
              }).range(ref.from, ref.to),
            );
          }
          return;
        }

        // ---- marker hiding ----
        if (!LINE_MARK_NODES.has(name) && !INLINE_MARK_NODES.has(name)) return;
        const node = ref.node;
        if (!node) return;
        const owner = node.parent;
        if (!owner) return;
        let active: boolean;
        if (LINE_MARK_NODES.has(name)) {
          const startLine = doc.lineAt(owner.from).number;
          const endLine = doc.lineAt(owner.to).number;
          // Multi-line constructs (code block, blockquote, list) activate as a
          // whole; single-line constructs activate per line.
          active =
            startLine !== endLine
              ? overlaps(owner.from, owner.to)
              : activeLines.has(startLine);
        } else {
          // Inline construct: reveal its markers only when the cursor is inside
          // the span, not merely elsewhere on the same line.
          active = overlaps(owner.from, owner.to);
        }
        if (!active) {
          let to = node.to;
          // Swallow the whitespace that follows a line-level marker (`# `, `> `,
          // `- `) so live preview doesn't render a redundant leading space.
          if (LINE_MARK_NODES.has(name)) {
            const lineEnd = doc.lineAt(node.to).to;
            let p = to;
            while (p < lineEnd) {
              const ch = doc.sliceString(p, p + 1);
              if (ch === ' ' || ch === '\t') p++;
              else break;
            }
            to = p;
          }
          markRanges.push(hideMark.range(node.from, to));
        }
      },
    });
  }

  hideRegexDelimiters(highlightDelim, view, overlaps, markRanges);
  hideRegexDelimiters(strikeDelim, view, overlaps, markRanges);
  buildRenderWidgets(view, overlaps, widgetRanges);

  // Draw the connecting guide line on an empty line that sits between two list
  // items (so it appears only in the gap, aligned under the bullet markers).
  const docLines = doc.lines;
  for (let l = 2; l < docLines; l++) {
    if (listItemLines.has(l - 1) && listItemLines.has(l + 1)) {
      const line = doc.line(l);
      if (line.text.trim() === '') {
        addLineClass(line.from, line.from, GAP_LINE);
      }
    }
  }

  const ranges: Range<Decoration>[] = [...markRanges, ...widgetRanges];
  for (const [pos, set] of lineClasses) {
    ranges.push(Decoration.line({ class: [...set].join(' ') }).range(pos));
  }

  return Decoration.set(ranges, true);
}

function hideRegexDelimiters(
  regex: RegExp,
  view: EditorView,
  overlaps: (a: number, b: number) => boolean,
  ranges: Range<Decoration>[],
) {
  const doc = view.state.doc;
  const text = doc.toString();
  regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    if (m.index === undefined) continue;
    const openFrom = m.index;
    const openTo = openFrom + m[1].length;
    const closeTo = m.index + m[0].length;
    const closeFrom = closeTo - m[1].length;
    // Reveal the delimiters only when the caret is inside the construct span.
    if (overlaps(openFrom, closeTo)) continue;
    ranges.push(hideMark.range(openFrom, openTo));
    ranges.push(hideMark.range(closeFrom, closeTo));
  }
}

// Replaces `<sub>`/`<sup>` HTML and `$…$`/`$$…$$` formulas with rendered
// widgets in live preview. Widgets are skipped while the caret is inside the
// construct so the raw source can be edited (Obsidian-style reveal-on-edit).
function buildRenderWidgets(
  view: EditorView,
  overlaps: (a: number, b: number) => boolean,
  widgetRanges: Range<Decoration>[],
): void {
  const text = view.state.doc.toString();
  const occupied: Array<[number, number]> = [];

  const pushWidget = (from: number, to: number, widget: WidgetType) => {
    if (from >= to) return;
    if (overlaps(from, to)) return;
    for (const [a, b] of occupied) {
      if (from < b && to > a) return;
    }
    occupied.push([from, to]);
    widgetRanges.push(Decoration.replace({ widget }).range(from, to));
  };

  for (const [re, tag] of [
    [/<sub>([\s\S]*?)<\/sub>/g, 'sub'],
    [/<sup>([\s\S]*?)<\/sup>/g, 'sup'],
  ] as const) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      const from = m.index;
      const to = from + m[0].length;
      pushWidget(from, to, new SubSupWidget(tag, m[1]));
    }
  }

  // Block math `$$…$$` first so inline math doesn't claim its contents.
  {
    const re = /\$\$([\s\S]+?)\$\$/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const from = m.index;
      const to = from + m[0].length;
      pushWidget(from, to, new MathWidget(m[1], true));
    }
  }

  // Inline math `$…$`.
  {
    const re = /\$([^$\n]+?)\$/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const from = m.index;
      const to = from + m[0].length;
      pushWidget(from, to, new MathWidget(m[1], false));
    }
  }
}
