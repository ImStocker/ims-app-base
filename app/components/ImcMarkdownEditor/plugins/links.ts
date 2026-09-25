import { syntaxTree } from '@codemirror/language';
import {
  RangeSet,
  StateField,
  type EditorState,
  type Extension,
  type Range,
  type Text,
} from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import EditorManager from '../../../logic/managers/EditorManager';
import type { IAppManager } from '../../../logic/managers/IAppManager';

interface PluginConfig {
  appManager: IAppManager;
}

function openLink(url: string, appManager: IAppManager) {
  const trimmed = url.trim();

  const assetMatch = trimmed.match(/^#asset:([0-9a-f-]+)$/i);
  if (assetMatch) {
    appManager.get(EditorManager).openAsset(assetMatch[1], 'popup');
    return;
  }

  // Open web/mail URLs in a new tab.
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^ftp:\/\//i.test(trimmed)
  ) {
    window.open(trimmed, '_blank', 'noopener,noreferrer');
    return;
  }

  // Best-effort fallback for relative/asset paths.
  window.open(trimmed, '_blank', 'noopener,noreferrer');
}

// The whole link (label + markers) gets this class so it is visually a link and
// so a mousedown on it can be intercepted to open the URL. The markers
// (`[`, `]`, `(`, `)` and the URL) stay hidden by the live-preview plugin.
const linkMark = Decoration.mark({ class: 'cm-md-link' });

// The grammar parses a URL-shaped *label* as a `URL` node too
// (`[https://a](https://b)` has two URL children: the label and the target).
// The target is the URL that directly follows the `(` `LinkMark` — the label
// (which may itself be a URL or contain one) comes before the `]`.
// NOTE: the returned node must be compared by position, not identity — the
// sibling-derived node is a distinct object from the one an iterator yields.
export function getLinkTargetUrl(
  link: SyntaxNode,
  doc: Text,
): SyntaxNode | null {
  // Autolinks (`<https://x>` or a bare URL) have a single URL child that is
  // both text and target.
  if (link.name === 'Autolink') return link.getChild('URL');
  const linkMarks = link.getChildren('LinkMark');
  if (linkMarks.length === 0) return link.getChild('URL');
  let cur = link.firstChild;
  while (cur) {
    if (cur.name === 'LinkMark' && doc.sliceString(cur.from, cur.to) === '(') {
      const next = cur.nextSibling;
      if (!next) return null;
      if (next.name === 'URL') return next;
      if (next.name === 'Autolink') return next.getChild('URL');
      return null;
    }
    cur = cur.nextSibling;
  }
  return null;
}

const decorate = (
  state: EditorState,
  _appManager: IAppManager,
): DecorationSet => {
  const ranges: Range<Decoration>[] = [];

  const cursorInside = (from: number, to: number) =>
    state.selection.ranges.some((r) =>
      // A collapsed caret counts as inside only when strictly between the
      // delimiters — a caret sitting at the exact boundary (e.g. the document's
      // first position, or right after the closing `)`) must keep the link
      // rendered/clickable, like live-preview's reveal logic does.
      r.from === r.to
        ? r.from > from && r.from < to
        : r.from <= to && r.to >= from,
    );

  // Walk the URL nodes (also matched/hidden by the live-preview plugin) and
  // mark their enclosing Link/Autolink as clickable. Only the *target* URL
  // (last URL child of a Link) drives the mark — a URL-shaped label is a URL
  // node too, but the Link must be marked only once.
  const seenLinks = new Set<number>();
  syntaxTree(state).iterate({
    enter: (ref) => {
      if (ref.type.name !== 'URL') return;
      const link = ref.node.parent;
      if (!link) return;
      const linkName = link.name;
      if (linkName !== 'Link' && linkName !== 'Autolink') return;
      const targetUrl = getLinkTargetUrl(link, state.doc);
      if (
        !targetUrl ||
        targetUrl.from !== ref.node.from ||
        targetUrl.to !== ref.node.to
      ) {
        return;
      }

      // Skip incomplete links (`[]()` / `[text]()`): there is nothing to open,
      // and marking them clickable would be misleading.
      const url = state.doc.sliceString(ref.from, ref.to);
      if (!url) return;

      const from = link.from;
      const to = link.to;

      // While the caret is inside the link, show the raw markdown so it can be
      // edited (consistent with wiki links / the live-preview marker reveal).
      if (cursorInside(from, to)) return;
      if (seenLinks.has(from)) return;
      seenLinks.add(from);

      ranges.push(linkMark.range(from, to));
    },
  });

  ranges.sort((a, b) => a.from - b.from);
  return ranges.length > 0 ? RangeSet.of(ranges) : Decoration.none;
};

export const linkWidgets = (config: PluginConfig): Extension => {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return decorate(state, config.appManager);
    },
    update(value, tr) {
      if (
        tr.docChanged ||
        tr.selectionSet ||
        syntaxTree(tr.state) !== syntaxTree(tr.startState)
      ) {
        return decorate(tr.state, config.appManager);
      }
      return value.map(tr.changes);
    },
    provide(f) {
      return EditorView.decorations.from(f);
    },
  });

  // Open the link when the user clicks the (clickable) link text.
  const handlers = EditorView.domEventHandlers({
    mousedown: (event, view) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.closest('.cm-md-link')) return false;

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) return false;

      const node = syntaxTree(view.state).resolve(pos, -1);
      let link = node;
      while (link && link.name !== 'Link' && link.name !== 'Autolink') {
        link = link.parent;
      }
      if (!link) return false;

      const urlNode = getLinkTargetUrl(link, view.state.doc);
      const url = urlNode
        ? view.state.doc.sliceString(urlNode.from, urlNode.to)
        : '';
      if (!url) return false;

      event.preventDefault();
      openLink(url, config.appManager);
      return true;
    },
  });

  return [field, handlers];
};
