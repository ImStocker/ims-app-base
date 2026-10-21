import { syntaxTree } from '@codemirror/language';
import type { EditorState, Text } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { findBareMarkdownLinks } from '../markdown-links';

// Node types whose text is never a bare link: code, raw HTML and the links
// themselves (the target of a link is not a link of its own).
export const NON_LINK_TEXT_NODES = new Set([
  'CodeText',
  'InlineCode',
  'HTMLBlock',
  'HTMLTag',
  'Link',
  'Image',
  'Autolink',
  'WikiLink',
]);

// The grammar parses a URL-shaped *label* as a `URL` node too
// (`[https://a](https://b)` has two URL children: the label and the target).
// The target is the URL that directly follows the `(` `LinkMark` — the label
// (which may itself be a URL or contain one) comes before the `]`.
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

// A link of the document: the range it covers and the address it points at.
export interface MarkdownLinkRange {
  from: number;
  to: number;
  href: string;
}

interface TextRange {
  from: number;
  to: number;
}

// The ranges of the document where an address is not a link (code, raw HTML,
// the links themselves).
function getNonLinkTextRanges(state: EditorState): TextRange[] {
  const ranges: TextRange[] = [];
  syntaxTree(state).iterate({
    enter: (ref) => {
      if (!NON_LINK_TEXT_NODES.has(ref.type.name)) return;
      ranges.push({ from: ref.from, to: ref.to });
    },
  });
  return ranges;
}

// Merges the ranges that overlap or touch each other, so the check whether a
// position is inside one of them stays cheap (the ranges of the syntax tree
// can be nested, e.g. an `HTMLBlock` and the `HTMLTag` inside it).
function mergeRanges(ranges: TextRange[]): TextRange[] {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const merged: TextRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.from <= last.to) {
      last.to = Math.max(last.to, range.to);
    } else {
      merged.push({ from: range.from, to: range.to });
    }
  }
  return merged;
}

// Tells whether the text between `from` and `to` is inside one of the given
// ranges. Both the ranges and the asked positions come in the order of the
// document, so a single pass over the ranges is enough.
function createRangeChecker(
  ranges: TextRange[],
): (from: number, to: number) => boolean {
  const merged = mergeRanges(ranges);
  let index = 0;
  return (from, to) => {
    while (index < merged.length && merged[index].to <= from) index++;
    return index < merged.length && merged[index].from < to;
  };
}

// Finds the links of the document: the markdown links (`[text](url)` and the
// autolinks) and the bare addresses (`https://example.com`), which the
// presenter renders as links as well.
//
// `skip` tells whether a link has to be left out (the caret is inside it, so
// its raw markdown is shown and edited instead).
export function findMarkdownLinkRanges(
  state: EditorState,
  skip?: (from: number, to: number) => boolean,
): MarkdownLinkRange[] {
  const ranges: MarkdownLinkRange[] = [];
  const seen = new Set<number>();

  // The markdown links: the whole link (label + markers) is the link, the
  // address it points at is the target of the link.
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
        targetUrl.from !== ref.from ||
        targetUrl.to !== ref.to
      ) {
        // A URL-shaped *label* is a URL node too, but it is the text of the
        // link, not its target.
        return;
      }

      // Skip incomplete links (`[]()` / `[text]()`): there is nothing to open,
      // and marking them clickable would be misleading.
      const href = state.doc.sliceString(ref.from, ref.to);
      if (!href) return;

      const from = link.from;
      const to = link.to;
      if (skip?.(from, to)) return;
      if (seen.has(from)) return;
      seen.add(from);

      ranges.push({ from, to, href });
    },
  });

  // The bare addresses: they are links as well, the presenter renders them
  // as ones. The rule is the shared one, the editor only has to leave out the
  // places where an address is not a link.
  const isNonLinkText = createRangeChecker(getNonLinkTextRanges(state));
  const bareLinks = findBareMarkdownLinks(state.doc.toString(), isNonLinkText);
  for (const link of bareLinks) {
    if (skip?.(link.from, link.to)) continue;
    ranges.push(link);
  }

  ranges.sort((a, b) => a.from - b.from);
  return ranges;
}
