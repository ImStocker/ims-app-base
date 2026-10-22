// The rules for *external* addresses, shared by the markdown editor and the
// read-only presenter.
//
// Both render the same markdown, so they have to agree on which pieces of
// text are links and which address they point at. The rule that decides this
// therefore lives here, and both sides use it:
//
// - the presenter feeds it to `marked` as the tokenizer of its url rule;
// - the editor scans the document with it and marks the matches as links.
//
// The addresses the two markdown parsers understand differ (the grammar of
// CodeMirror does not know `ftp://` for example), which is exactly why the
// rule is not taken from either of them.
//
// Only external addresses are described here. A link that points *inside* the
// project (an asset of the project or a heading of the current document) is
// not a plain address — it is resolved by the app itself, so each side keeps
// handling it on its own.

// A bare link is an address that is not written as a markdown link, e.g.
// `https://example.com` or `someone@example.com`.
//
// The schemes are the ones a GFM autolinker links: http, https and ftp. An
// address without a scheme (`www.example.com`, an e-mail address) gets one
// before it is opened.
const PROTOCOL = '(?:[hH][tT][tT][pP][sS]?|[fF][tT][pP])';
const EMAIL_SOURCE =
  '[A-Za-z0-9._+-]+(?:@)[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])';
const URL_SOURCE = `(?:${PROTOCOL}:\\/\\/|www\\.)(?:[a-zA-Z0-9-]+\\.?)+[^\\s<]*`;

// An e-mail address may not start in the middle of a word: `someone@x.com`
// is a link, `xxsomeone@x.com` is not.
const BARE_URL_SOURCE =
  `(?<url>${URL_SOURCE})` +
  `|(?<email>(?<![a-zA-Z0-9.!#$%&'*+/=?_\`{|}~-])${EMAIL_SOURCE})`;

// Scans a text for bare links.
const BARE_URL_RE = new RegExp(BARE_URL_SOURCE, 'g');

// Matches a bare link at the very beginning of a text.
const BARE_URL_AT_START_RE = new RegExp(`^(?:${BARE_URL_SOURCE})`);

// The trailing punctuation of an address is not part of the link:
// `https://example.com,` links `https://example.com`.
const TRAILING_PUNCTUATION_RE =
  /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/;

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const WWW_RE = /^www\./i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cuts the trailing punctuation off an address.
export function trimMarkdownUrl(url: string): string {
  let current = url;
  for (;;) {
    const next = TRAILING_PUNCTUATION_RE.exec(current)?.[0] ?? '';
    if (next === current) return current;
    current = next;
  }
}

// `www.example.com` and a bare e-mail address have no scheme, so they need
// one before they can be opened.
export function normalizeMarkdownHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return trimmed;
  if (SCHEME_RE.test(trimmed)) return trimmed;
  if (WWW_RE.test(trimmed)) return `http://${trimmed}`;
  if (EMAIL_RE.test(trimmed)) return `mailto:${trimmed}`;
  return trimmed;
}

// The text that is rendered as a link and the address it points at.
export interface BareMarkdownLink {
  text: string;
  href: string;
}

// Turns a match of `BARE_URL_RE` into the text and the address of the link.
export function resolveBareMarkdownLink(
  match: RegExpExecArray,
): BareMarkdownLink {
  const is_url = match.groups?.url !== undefined;
  const text = is_url ? trimMarkdownUrl(match[0]) : match[0];
  return { text, href: normalizeMarkdownHref(text) };
}

// Matches the bare link at the beginning of a text, the way the presenter
// tokenizes its content.
export function matchBareMarkdownLink(src: string): BareMarkdownLink | null {
  const match = BARE_URL_AT_START_RE.exec(src);
  if (!match) return null;
  return resolveBareMarkdownLink(match);
}

// A bare link inside a text.
export interface BareMarkdownLinkSpan extends BareMarkdownLink {
  from: number;
  to: number;
}

// Scans a text for the bare links it contains — the way the editor looks for
// them. `isExcluded` tells whether a span is a place where an address is not a
// link (a code block, a markdown link, raw HTML, …).
export function findBareMarkdownLinks(
  text: string,
  isExcluded?: (from: number, to: number) => boolean,
): BareMarkdownLinkSpan[] {
  const links: BareMarkdownLinkSpan[] = [];
  for (const match of text.matchAll(BARE_URL_RE)) {
    const index = match.index;
    if (index === undefined) continue;

    const { text: linkText, href } = resolveBareMarkdownLink(match);
    if (!linkText) continue;

    const from = index;
    const to = index + linkText.length;
    if (isExcluded?.(from, to)) continue;

    links.push({ from, to, text: linkText, href });
  }
  return links;
}

// Resolves an href into the external address it points at. `null` means the
// href points inside the project (an asset of the project or a heading of the
// current document) — those are not addresses the browser could open, the app
// resolves them itself.
export function resolveExternalHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#')) return null;
  return normalizeMarkdownHref(trimmed);
}
