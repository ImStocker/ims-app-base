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

// Teach `marked` to render Obsidian-style `![alt|300](url)` images with the
// requested pixel width. Mirrors the `|NNN` size the ImcMarkdownEditor live
// preview uses, so read-only / exported markdown matches the editor.
export const markdownImageWidthExtension: TokenizerAndRendererExtension = {
  name: 'image',
  level: 'inline',
  renderer(token: { href: string; title: string | null; text: string }) {
    const size_match = IMAGE_SIZE_RE.exec(token.text);
    const alt = size_match ? token.text.slice(0, size_match.index) : token.text;
    const width = size_match ? size_match[1] : '';
    const title_attr = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    const size_attr = width
      ? ` width="${width}" style="max-width:100%; width:${width}px;"`
      : '';
    return (
      `<img src="${escapeHtml(token.href)}" alt="${escapeHtml(alt)}"` +
      `${title_attr}${size_attr}>`
    );
  },
};
