import type { TokenizerAndRendererExtension } from 'marked';

// `|NNN` suffix (the `\|NNN` table-cell form is accepted too, since the
// rendered text may either keep the backslash or already have it resolved).
const IMAGE_SIZE_RE = /\|{1,2}(\d{1,4})$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Shared with ImcMarkdownPresenter, which resolves `@store/...` file hrefs to
// absolute URLs before rendering the `<img>`.  Keeps the `|NNN` width handling
// in a single place instead of duplicating it across renderers.  `extraAttrs`
// lets the presenter annotate the element with the source file (`data-store`,
// `data-file-id`, ...) so a click can reopen it in `FilePresenterDialog`.
export function renderImageHtml(
  href: string,
  title: string | null,
  text: string,
  extraAttrs: Record<string, string> = {},
): string {
  const size_match = IMAGE_SIZE_RE.exec(text);
  const alt = size_match ? text.slice(0, size_match.index) : text;
  const width = size_match ? size_match[1] : '';
  const title_attr = title ? ` title="${escapeHtml(title)}"` : '';
  const size_attr = width
    ? ` width="${width}" style="max-width:100%; width:${width}px;"`
    : '';
  const extra_attrs = Object.entries(extraAttrs)
    .map(([k, v]) => ` ${escapeHtml(k)}="${escapeHtml(v)}"`)
    .join('');
  return `<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}"${title_attr}${size_attr}${extra_attrs}>`;
}

// Teach `marked` to render Obsidian-style `![alt|300](url)` images with the
// requested pixel width. Mirrors the `|NNN` size the ImcMarkdownEditor live
// preview uses, so read-only / exported markdown matches the editor.
export const markdownImageWidthExtension: TokenizerAndRendererExtension = {
  name: 'image',
  level: 'inline',
  renderer(token: { href: string; title: string | null; text: string }) {
    return renderImageHtml(token.href, token.title, token.text);
  },
};
