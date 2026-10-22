import {
  RangeSet,
  StateField,
  type EditorState,
  type Extension,
  type Range,
} from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import EditorManager from '../../../logic/managers/EditorManager';
import type { IAppManager } from '../../../logic/managers/IAppManager';
import { resolveExternalHref } from '../markdown-links';
import { findMarkdownLinkRanges } from './link-scan';

export { getLinkTargetUrl } from './link-scan';

interface PluginConfig {
  appManager: IAppManager;
}

function openLink(href: string, appManager: IAppManager) {
  const trimmed = href.trim();

  // An internal link: the asset of the project it points at is opened by the
  // app itself.
  const assetMatch = trimmed.match(/^#asset:([0-9a-f-]+)$/i);
  if (assetMatch) {
    appManager.get(EditorManager).openAsset(assetMatch[1], 'popup');
    return;
  }

  // An external address: the shared rules decide how it is written, so the
  // editor and the presenter open the very same address.
  window.open(
    resolveExternalHref(trimmed) ?? trimmed,
    '_blank',
    'noopener,noreferrer',
  );
}

// The whole link (label + markers) gets this class so it is visually a link and
// so a mousedown on it can be intercepted to open the URL. The markers
// (`[`, `]`, `(`, `)` and the URL) stay hidden by the live-preview plugin.
//
// The address the link points at is carried along, so a click does not have to
// resolve the syntax tree again.
function linkMark(href: string): Decoration {
  return Decoration.mark({
    class: 'cm-md-link',
    attributes: { 'data-md-href': href },
  });
}

const decorate = (state: EditorState): DecorationSet => {
  const ranges: Range<Decoration>[] = [];

  // While the caret is inside a link, the raw markdown is shown so it can be
  // edited (consistent with the wiki links and the live-preview markers).
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

  for (const link of findMarkdownLinkRanges(state, cursorInside)) {
    ranges.push(linkMark(link.href).range(link.from, link.to));
  }

  return ranges.length > 0 ? RangeSet.of(ranges) : Decoration.none;
};

export const linkWidgets = (config: PluginConfig): Extension => {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return decorate(state);
    },
    update(value, tr) {
      if (
        tr.docChanged ||
        tr.selectionSet ||
        syntaxTree(tr.state) !== syntaxTree(tr.startState)
      ) {
        return decorate(tr.state);
      }
      return value.map(tr.changes);
    },
    provide(f) {
      return EditorView.decorations.from(f);
    },
  });

  // Open the link when the user clicks the (clickable) link text.
  const handlers = EditorView.domEventHandlers({
    mousedown: (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return false;

      // The decoration of a link carries the address it points at.
      const link = target.closest<HTMLElement>('[data-md-href]');
      if (!link) return false;

      const href = link.getAttribute('data-md-href');
      if (!href) return false;

      event.preventDefault();
      openLink(href, config.appManager);
      return true;
    },
  });

  return [field, handlers];
};
