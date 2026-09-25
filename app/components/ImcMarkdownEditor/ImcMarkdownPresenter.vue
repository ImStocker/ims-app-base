<template>
  <div
    ref="rootRef"
    class="ImcMarkdownPresenter cm-live-preview"
    v-html="renderedHtml"
  ></div>
</template>

<script lang="ts">
import { defineComponent, h, render } from 'vue';
import { Marked, type TokenizerAndRendererExtension } from 'marked';
import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css?inline';
import AssetLink from '../Asset/AssetLink.vue';
import type { AssetLink as AssetLinkData } from '../../logic/types/AssetsType';
import type { AssetPropValueFile } from '../../logic/types/Props';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import FileManager from '../../logic/managers/FileManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import EditorManager from '../../logic/managers/EditorManager';
import UiManager from '../../logic/managers/UiManager';
import DialogManager from '../../logic/managers/DialogManager';
import FilePresenterDialog from '../File/FilePresenterDialog.vue';
import type { IAppManager } from '../../logic/managers/IAppManager';
import { renderImageHtml } from '../../logic/utils/markdownImageWidth';
import { parseImagePathToFile } from './plugins/imc-images';
import { parseLinkAddress, parseWikiLink } from './plugins/wiki-links/format';
import {
  generateTextHeaderAnchor,
  makeAnchorTagId,
} from '../../logic/utils/assets';

// Declared after the imports so ESLint's `import/first` stays satisfied
// while still letting the `?inline` CSS import below type-check.
declare module '*.css?inline' {
  const css: string;
  export default css;
}

// Module-level context set right before a synchronous `parse()` and cleared
// afterwards (mirrors the `tableAppManager` pattern in TableWidget.vue). The
// heading/wiki-link/math renderers need it to resolve asset labels, heading
// ids and links while rendering the static HTML.
let presenterContext: {
  appManager: IAppManager | null;
  blockId: string;
} | null = null;

// Deduplicated heading anchors for a single parse run, so `[[#anchor]]`
// navigation matches the anchor table the editor produces.
const usedAnchors = new Set<string>();

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(value: string): string {
  return esc(value).replace(/"/g, '&quot;');
}

// `==highlight==` — the same syntax the editor decorates in mark-styles.ts.
const highlightExtension: TokenizerAndRendererExtension = {
  name: 'highlight',
  level: 'inline',
  start(src: string) {
    return src.indexOf('==');
  },
  tokenizer(src: string) {
    const match = /^==([^=\n]+)==/.exec(src);
    if (match) {
      return {
        type: 'highlight',
        raw: match[0],
        text: match[1],
      };
    }
  },
  renderer(token) {
    return `<mark class="cm-md-highlight">${esc(token.text)}</mark>`;
  },
};

// Renders Obsidian-style `[[asset:id|label]]` / `[[title]]` / `[[#anchor]]`
// wiki links the same way the live editor shows them: asset/block/header
// links become `AssetLink` placeholders (mounted as Vue components after the
// `v-html` renders), everything else becomes a `.cm-md-link` anchor.
const wikiLinkExtension: TokenizerAndRendererExtension = {
  name: 'wikiLink',
  level: 'inline',
  start(src: string) {
    return src.indexOf('[[');
  },
  tokenizer(src: string) {
    const match = /^\[\[([^\]\n]+)\]\]/.exec(src);
    if (match) {
      return {
        type: 'wikiLink',
        raw: match[0],
        text: match[1],
      };
    }
  },
  renderer(token) {
    const parsed = parseWikiLink(token.text);
    if (!parsed) {
      const title = token.text.trim() || token.text;
      return `<a class="cm-md-link" data-wiki-title="${escAttr(
        title,
      )}">${esc(title)}</a>`;
    }

    const address = parseLinkAddress(parsed.address);

    if (
      address.kind === 'asset' ||
      address.kind === 'assetBlock' ||
      address.kind === 'assetHeader'
    ) {
      const cached = presenterContext?.appManager
        ?.get(CreatorAssetManager)
        .getAssetShortViaCacheSync(address.assetId);
      const asset_id = cached?.id ?? address.assetId;
      const label = parsed.label || cached?.title || parsed.address;
      const block_id =
        address.kind === 'assetBlock' ? address.blockId || '' : '';
      const anchor =
        address.kind === 'assetBlock'
          ? (address.anchor ?? '')
          : address.kind === 'assetHeader'
            ? address.anchor
            : '';
      return (
        `<span class="cm-md-asset-link" data-asset-id="${escAttr(asset_id)}"` +
        `${block_id ? ` data-block-id="${escAttr(block_id)}"` : ''}` +
        `${anchor ? ` data-anchor="${escAttr(anchor)}"` : ''}` +
        `>${esc(label)}</span>`
      );
    }

    if (address.kind === 'localHeader') {
      const href = `#${address.anchor}`;
      const label = parsed.label || `#${address.anchor}`;
      return `<a class="cm-md-link" href="${escAttr(href)}">${esc(label)}</a>`;
    }

    const label = parsed.label || address.title;
    return `<a class="cm-md-link" data-wiki-title="${escAttr(
      address.title,
    )}">${esc(label)}</a>`;
  },
};

// Block `$$...$$` display math, rendered with KaTeX just like the editor.
const mathBlockExtension: TokenizerAndRendererExtension = {
  name: 'mathBlock',
  level: 'block',
  start(src: string) {
    return src.indexOf('$$');
  },
  tokenizer(src: string) {
    const match = /^\$\$\n?([\s\S]+?)\n?\$\$/m.exec(src);
    if (match) {
      return {
        type: 'mathBlock',
        raw: match[0],
        text: match[1].trim(),
      };
    }
  },
  renderer(token) {
    return renderMath(token.text, true);
  },
};

// Inline `$...$` math, plus a fallback for `$$...$$` display math that appears
// mid-paragraph (the block-level tokenizer only fires at line starts; the
// editor's live preview matches `$$...$$` anywhere, so mirror that here).
const mathInlineExtension: TokenizerAndRendererExtension = {
  name: 'math',
  level: 'inline',
  start(src: string) {
    return src.indexOf('$');
  },
  tokenizer(src: string) {
    if (src.startsWith('$$')) {
      const match = /^\$\$([\s\S]+?)\$\$/.exec(src);
      if (match) {
        return {
          type: 'math',
          raw: match[0],
          text: match[1].trim(),
          display: true,
        };
      }
      return;
    }
    const match = /^\$([^$\n]+)\$/.exec(src);
    if (match) {
      return {
        type: 'math',
        raw: match[0],
        text: match[1],
        display: false,
      };
    }
  },
  renderer(token) {
    return renderMath(token.text, token.display);
  },
};

function renderMath(tex: string, display: boolean): string {
  let html: string;
  try {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch {
    html = esc(tex);
  }
  return display
    ? `<div class="cm-md-math-render cm-md-math-render-display">${html}</div>`
    : `<span class="cm-md-math-render">${html}</span>`;
}

// Obsidian-style callouts `> [!info] Title` / `>` continuation lines. Rendered
// with the same `.cm-md-callout` classes the editor applies to callout lines.
const calloutExtension: TokenizerAndRendererExtension = {
  name: 'callout',
  level: 'block',
  start(src: string) {
    let lineStart = 0;
    const lines = src.split('\n');
    for (const line of lines) {
      if (line.startsWith('>') && line.includes('[!')) return lineStart;
      lineStart += line.length + 1;
    }
    return undefined;
  },
  tokenizer(src: string) {
    const lines = src.split('\n');
    const first = /^(?:>\s*)\[!(\w+)\]\s*(.*)$/.exec(lines[0]);
    if (!first) return;
    if (!lines[0].startsWith('>')) return;

    const calloutType = first[1].toLowerCase();
    const calloutTitle = first[2]?.trim() ?? '';
    const bodyLines: string[] = [];
    let i = 1;
    while (i < lines.length && /^\s*>/.test(lines[i])) {
      bodyLines.push(lines[i].replace(/^\s*>\s?/, ''));
      i++;
    }

    let raw = lines.slice(0, i).join('\n');
    if (!raw.endsWith('\n')) raw += '\n';

    return {
      type: 'callout',
      raw,
      text: bodyLines.join('\n'),
      calloutType,
      calloutTitle,
    };
  },
  renderer(token) {
    const body = token.text ? presenterMarked.parse(token.text) : '';
    const titleHtml = token.calloutTitle
      ? `<div class="cm-md-callout-title">${esc(token.calloutTitle)}</div>`
      : '';
    return `<div class="cm-md-callout cm-md-callout-${escAttr(
      token.calloutType,
    )}">${titleHtml}<div class="cm-md-callout-body">${body}</div></div>`;
  },
};

const presenterMarked = new Marked({ gfm: true, breaks: true });

// Consecutive blank lines collapse to a single `<p>\n<p>` in marked's output.
// Under `white-space: pre-wrap` one separator newline renders as one line-gap,
// so 2+ empty lines in the source collapse visually to one.  Turn each extra
// blank line into a zero-height placeholder block; the preserved newlines
// around it then contribute one line-gap each, matching the editor line-by-line.
const blankLinesExtension: TokenizerAndRendererExtension = {
  name: 'blankLines',
  level: 'block',
  start(src: string) {
    return /^\n{2,}/.test(src) ? 0 : -1;
  },
  tokenizer(src: string) {
    const match = /^\n{2,}/.exec(src);
    if (!match) return;
    const count = match[0].length - 1; // extra blank-lines beyond the separator
    if (count < 1) return;
    return {
      type: 'blankLines',
      raw: match[0],
      count,
    };
  },
  renderer(token) {
    return new Array(token.count)
      .fill('<div class="cm-md-blank-line"></div>')
      .join('\n');
  },
};

// Images referencing uploaded files (`@store/path#fileId`) are rendered with a
// resolved file URL, exactly like the editor's `ImageWidget` does.  The resolved
// file is also recorded on the element (`data-store`, `data-file-id`, ...
// mirrors ImcTextFile's dataset), so a click can reopen it in
// `FilePresenterDialog`.  Anything else (http/data src, plain paths) is left to
// the shared width-aware renderer.
const presenterImageExtension: TokenizerAndRendererExtension = {
  name: 'image',
  level: 'inline',
  renderer(token) {
    const href = token.href ?? '';
    let resolved = href;
    if (href.startsWith('<') && href.endsWith('>')) {
      resolved = href.slice(1, -1).trim();
    }
    let extraAttrs: Record<string, string> = {};
    // The canonical `/file/{Store}/{FileId}` URL form (`http[s]://host/...` or
    // root-relative) is a store reference too, so those images also become
    // clickable and keep the resolved URL as-is.  Everything non-http passes
    // through `parseImagePathToFile`.
    if (resolved.startsWith('data')) {
      // Data URLs are never store references.
    } else {
      const appManager = presenterContext?.appManager;
      const file = parseImagePathToFile(
        resolved,
        appManager?.$env.FILE_STORAGE_API_HOST,
      );
      if (file?.FileId && appManager) {
        if (!resolved.startsWith('http')) {
          resolved = appManager
            .get(FileManager)
            .getFileUrl(file as AssetPropValueFile);
        }
        extraAttrs = {
          'data-store': file.Store ?? '',
          'data-file-id': file.FileId ?? '',
          'data-title': file.Title ?? '',
          'data-dir': file.Dir ?? '',
        };
      }
    }
    return renderImageHtml(
      resolved,
      token.title ?? null,
      token.text ?? '',
      extraAttrs,
    );
  },
};

presenterMarked.use({
  extensions: [
    highlightExtension,
    presenterImageExtension,
    wikiLinkExtension,
    mathBlockExtension,
    mathInlineExtension,
    calloutExtension,
    blankLinesExtension,
  ],
  renderer: {
    codespan(token) {
      return `<code class="cm-code">${esc(token.text)}</code>`;
    },
    // Fenced & indented code blocks: a header with the language label + copy
    // button, mirroring the editor's `cm-md-code-tools`. Mermaid blocks get a
    // placeholder container that is rendered with the `mermaid` package after
    // the `v-html` output is mounted.
    code(token) {
      const lang = token.lang ? token.lang.split(/\s+/)[0] : null;
      if (lang && lang.toLowerCase() === 'mermaid') {
        return `<div class="cm-md-mermaid-render" data-mermaid-source="${encodeURIComponent(
          token.text,
        )}"></div>`;
      }
      const langLabel = lang
        ? `<span class="cm-md-code-lang">${esc(lang)}</span>`
        : '';
      const copyBtn =
        `<button type="button" class="cm-md-code-copy" title="Copy code" ` +
        `aria-label="Copy code"><i class="ri ri-file-copy-line"></i></button>`;
      // Indented code tokens arrive with `escaped: true` (text already HTML-
      // escaped by the tokenizer); fenced blocks are raw. Escape only the raw
      // ones so `<`/`&` aren't double-escaped.
      const codeText = token.escaped ? token.text : esc(token.text);
      return (
        `<div class="cm-md-codeblock"><div class="cm-md-code-tools">` +
        `${langLabel}${copyBtn}</div>` +
        `<pre><code${lang ? ` class="language-${escAttr(lang)}"` : ''}>${codeText}</code></pre></div>`
      );
    },
    // Headings carry the same anchor the editor computes (`data-md-header-
    // anchor` + `<id>`), so `[[#anchor]]` links and the contents scroll spy
    // keep working on presented content.
    heading(token) {
      const anchor = generateTextHeaderAnchor(token.text, usedAnchors);
      const id = presenterContext?.blockId
        ? makeAnchorTagId(presenterContext.blockId, 'h-' + anchor)
        : anchor;
      const content = this.parser.parseInline(token.tokens);
      return `<h${token.depth} id="${escAttr(id)}" data-md-header-anchor="${escAttr(
        anchor,
      )}">${content}</h${token.depth}>`;
    },
    link(token) {
      const href = token.href ?? '';
      const title = token.title ? ` title="${escAttr(token.title)}"` : '';
      // Render the already-tokenized child tokens instead of re-parsing
      // `token.text`: a URL in the label would otherwise be re-tokenized as
      // a GFM autolink `link` token, and this renderer would recurse forever.
      const text = this.parser.parseInline(token.tokens);
      return `<a class="cm-md-link" href="${escAttr(href)}"${title}>${text}</a>`;
    },
    blockquote(token) {
      const body = this.parser.parse(token.tokens).replace(/\s+$/, '');
      return `<blockquote>${body}</blockquote>`;
    },
  },
});

// The KaTeX stylesheet re-scoped under the presenter container, so formulas
// keep the same layout the editor produces (injected once into <head>).
const katexCssScoped = katexCss.replace(
  /(@?[^{}@]+)\{([^{}]*)\}/g,
  function (_m, sel, body) {
    if (sel.trim().charAt(0) === '@') return _m;
    return (
      sel
        .split(',')
        .map(function (s) {
          return '.ImcMarkdownPresenter .cm-md-math-render ' + s.trim();
        })
        .join(',') +
      '{' +
      body +
      '}'
    );
  },
);

let mermaidWidgetSeq = 0;

export default defineComponent({
  name: 'ImcMarkdownPresenter',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    blockId: {
      type: String,
      default: '',
    },
  },
  computed: {
    renderedHtml(): string {
      presenterContext = {
        appManager:
          ((this as any).$getAppManager?.() as IAppManager | null) ?? null,
        blockId: this.blockId,
      };
      usedAnchors.clear();
      try {
        // `marked` ends every block with `\n`; with `pre-wrap` that trailing
        // newline renders as a phantom empty line after the last block.
        return (presenterMarked.parse(this.modelValue) as string).trimEnd();
      } finally {
        presenterContext = null;
      }
    },
  },
  mounted() {
    this._injectKatexStyle();
    (this.$refs.rootRef as HTMLElement)?.addEventListener(
      'click',
      this._onClick,
    );
    this._postRender();
  },
  updated() {
    this._postRender();
  },
  beforeUnmount() {
    (this.$refs.rootRef as HTMLElement)?.removeEventListener(
      'click',
      this._onClick,
    );
  },
  methods: {
    _injectKatexStyle() {
      if (document.querySelector('style[data-katex-presenter]')) return;
      const style = document.createElement('style');
      style.setAttribute('data-katex-presenter', '');
      style.textContent = katexCssScoped;
      document.head.appendChild(style);
    },
    _postRender() {
      const root = this.$refs.rootRef as HTMLElement | null;
      if (!root) return;
      this._mountAssetLinks(root);
      this._bindCopyButtons(root);
      this._renderMermaid(root);
    },
    // Turns `[data-asset-id]` placeholder spans into `AssetLink` components,
    // exactly like the read-only cell preview in TableWidget.vue.
    _mountAssetLinks(root: HTMLElement) {
      const manager =
        ((this as any).$getAppManager?.() as IAppManager | null) ?? null;
      if (!manager) return;
      const project = manager.get(ProjectManager).getProjectInfo();
      if (!project) return;

      root.querySelectorAll<HTMLElement>('[data-asset-id]').forEach((el) => {
        if (el.getAttribute('data-mounted') === '1') return;
        const asset_id = el.getAttribute('data-asset-id')!;
        const block_id = el.getAttribute('data-block-id') || undefined;
        const anchor = el.getAttribute('data-anchor') || undefined;
        const label = (el.textContent ?? '').trim() || asset_id;

        const asset: AssetLinkData = { id: asset_id, anchor };
        if (block_id) asset.blockId = block_id;

        const vnode = h(
          AssetLink,
          { project, asset, openPopup: true },
          { default: () => label },
        );
        vnode.appContext = (this as any).$?.appContext ?? null;
        render(null, el);
        el.textContent = '';
        render(vnode, el);
        el.setAttribute('data-mounted', '1');
      });
    },
    _bindCopyButtons(root: HTMLElement) {
      root
        .querySelectorAll<HTMLButtonElement>('.cm-md-code-copy')
        .forEach((btn) => {
          if ((btn as any).__imcCopyBound) return;
          (btn as any).__imcCopyBound = true;
          btn.addEventListener('click', async () => {
            const pre = btn
              .closest('.cm-md-codeblock')
              ?.querySelector('pre code');
            const code = pre?.textContent ?? '';
            const icon = btn.querySelector('.ri');
            try {
              await navigator.clipboard.writeText(code);
              if (icon) {
                icon.className = 'ri ri-check-line';
                setTimeout(() => {
                  icon.className = 'ri ri-file-copy-line';
                }, 1500);
              }
            } catch {
              /* ignore */
            }
          });
        });
    },
    // Renders `data-mermaid-source` placeholders into local mermaid diagrams
    // (the same package/theme the editor's live preview uses).
    _renderMermaid(root: HTMLElement) {
      root
        .querySelectorAll<HTMLElement>('[data-mermaid-source]')
        .forEach((el) => {
          if (el.getAttribute('data-mermaid-rendered') === '1') return;
          const code = decodeURIComponent(
            el.getAttribute('data-mermaid-source') || '',
          );
          const theme =
            document.body.getAttribute('data-theme') === 'ims-dark'
              ? 'dark'
              : 'default';
          el.classList.add('cm-md-mermaid-loading');
          el.textContent = 'Loading diagram…';
          import('mermaid')
            .then(async ({ default: mermaid }) => {
              mermaid.initialize({
                startOnLoad: false,
                theme,
                securityLevel: 'loose',
              });
              const { svg } = await mermaid.render(
                'cm-md-mermaid-' + mermaidWidgetSeq++,
                code,
              );
              el.textContent = '';
              el.classList.remove('cm-md-mermaid-loading');
              el.classList.add('cm-md-mermaid-svg');
              el.innerHTML = svg;
            })
            .catch(() => {
              el.classList.remove('cm-md-mermaid-loading');
              el.classList.add('cm-md-mermaid-error');
              el.textContent = code || 'Mermaid diagram error';
            })
            .finally(() => {
              el.setAttribute('data-mermaid-rendered', '1');
            });
        });
    },
    _onClick(e: MouseEvent) {
      const manager =
        ((this as any).$getAppManager?.() as IAppManager | null) ?? null;

      // Clicking an image that points to an uploaded file (a `@store/...`
      // reference, recorded via `data-store`) opens it in `FilePresenterDialog`
      // — the same behaviour ImcTextFile has for inline files.  Images from the
      // same block are collected so the dialog can navigate between them.
      const img = (e.target as HTMLElement)?.closest<HTMLImageElement>(
        'img[data-store]',
      );
      if (img) {
        e.preventDefault();
        if (!manager) return;
        const file: AssetPropValueFile = {
          FileId: img.getAttribute('data-file-id') ?? '',
          Title: img.getAttribute('data-title') ?? '',
          Size: parseInt(img.getAttribute('data-size') ?? '0', 10),
          Dir: img.getAttribute('data-dir'),
          Store: img.getAttribute('data-store') ?? '',
        };
        if (!file.FileId) return;
        const rootEl = this.$refs.rootRef as HTMLElement | null;
        const files: AssetPropValueFile[] = rootEl
          ? Array.from(
              rootEl.querySelectorAll<HTMLImageElement>('img[data-store]'),
            )
              .map(
                (el): AssetPropValueFile => ({
                  FileId: el.getAttribute('data-file-id') ?? '',
                  Title: el.getAttribute('data-title') ?? '',
                  Size: parseInt(el.getAttribute('data-size') ?? '0', 10),
                  Dir: el.getAttribute('data-dir'),
                  Store: el.getAttribute('data-store') ?? '',
                }),
              )
              .filter((f) => Boolean(f.FileId))
          : [];
        manager.get(DialogManager).show(FilePresenterDialog, {
          value: file,
          files,
        });
        return;
      }

      const target = (e.target as HTMLElement)?.closest<HTMLAnchorElement>('a');
      if (!target) return;
      const href = target.getAttribute('href');

      if (href) {
        e.preventDefault();
        if (href.startsWith('#asset:')) {
          const assetMatch = /^#asset:([0-9a-f-]+)$/i.exec(href);
          if (assetMatch && manager) {
            manager.get(EditorManager).openAsset(assetMatch[1], 'popup');
          }
          return;
        }
        if (href.startsWith('#')) {
          const id = decodeURIComponent(href.slice(1));
          const element =
            (this.$refs.rootRef as HTMLElement)?.querySelector(
              `[data-md-header-anchor="${CSS.escape(id)}"]`,
            ) ?? (document.getElementById(id) as HTMLElement | null);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (
          /^https?:\/\//i.test(href) ||
          /^mailto:/i.test(href) ||
          /^ftp:\/\//i.test(href)
        ) {
          window.open(href, '_blank', 'noopener,noreferrer');
          return;
        }
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }

      // `[[Plain title]]` wiki links resolve the asset by title on click.
      const title = target.getAttribute('data-wiki-title');
      if (title) {
        e.preventDefault();
        if (!manager) return;
        manager
          .get(UiManager)
          .doTask(async () => {
            const asset_manager = manager.get(CreatorAssetManager);
            const cached =
              asset_manager.getAssetShortByTitleViaCacheSync(title);
            if (cached?.id) {
              manager.get(EditorManager).openAsset(cached.id, 'popup');
              return;
            }
            const res = await asset_manager.getAssetShortsList({
              where: { title, inside: 'gdd', isSystem: false },
              count: 1,
            });
            const first = res?.list?.[0];
            if (!first?.id) {
              throw new Error(
                manager.$t('markdownBlock.assetNotFound', { title }),
              );
            }
            manager.get(EditorManager).openAsset(first.id, 'popup');
          })
          .catch(() => {});
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@use '../../style/imc-text-format.scss';

.ImcMarkdownPresenter {
  @include imc-text-format.imc-text-format;
  position: relative;
  word-break: break-word;
  line-height: 2em;

  // The mixin sets `white-space: pre-wrap` so that empty lines between block
  // elements (present as literal newlines in marked's output) render as visible
  // gaps.  However the mixin's nested selectors (`p`, `h1-6`) don't reach
  // `v-html` content in a scoped block, so browser-default margins double up
  // with the pre-wrap gap.  Reset every block element via `:deep()`.
  :deep(p) {
    padding: 0;
    margin: 0;
  }

  // Zero-height block spacers emitted by `blankLinesExtension`.  Each div
  // sits between two preserved newlines (pre-wrap), so each surrounding
  // newline contributes one line-gap – producing exactly N visible gaps
  // for N consecutive empty lines in the source.
  :deep(.cm-md-blank-line) {
    display: block;
    height: 0;
    padding: 0;
    margin: 0;
    border: none;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin: 0;
    margin-bottom: 5px;
    font-weight: bold;
    line-height: var(--local-line-height);
    counter-reset: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8
      list-9;
  }

  // Uploaded-file images (annotated with `data-store`) open `FilePresenterDialog`
  // on click — indicate they're interactive like the editor does.
  :deep(img[data-store]) {
    cursor: pointer;
  }

  :deep(h1) {
    font-size: 20px;
    margin: 12px 0 10px;
  }

  :deep(h2) {
    font-size: 18px;
    margin: 10px 0 5px;
  }

  :deep(h3) {
    font-size: 17px;
  }

  :deep(h4) {
    font-size: 16px;
  }

  :deep(h5) {
    font-size: 1.02em;
  }

  :deep(h6) {
    font-size: 1em;
  }

  :deep(.cm-md-highlight) {
    background-color: rgba(255, 221, 0, 0.35);
    border-radius: 2px;
  }

  :deep(.cm-md-bold) {
    font-weight: 700;
  }

  :deep(.cm-md-italic) {
    font-style: italic;
  }

  :deep(.cm-md-strike) {
    text-decoration: line-through;
  }

  :deep(.cm-code) {
    background-color: rgba(135, 131, 120, 0.18);
    font-family: var(--ink-internal-code-font-family, monospace);
    font-size: 0.9em;
    border-radius: 3px;
    padding: 0.1em 0.3em;
  }

  :deep(.cm-md-link) {
    color: var(--local-link-color, #4a90d9) !important;
    text-decoration: underline;
    cursor: pointer;
  }

  :deep(blockquote) {
    border-left: 2px solid var(--ink-internal-syntax-comment-color, #8b949e);
    padding-left: 0.75em;
    margin: 0 0 0.5em;
  }

  // Callouts (the editor applies these on callout lines).
  :deep(.cm-md-callout) {
    --callout-color: 204, 204, 204;
    position: relative;
    border-left: 4px solid rgb(var(--callout-color));
    color: rgb(var(--callout-color));
    padding-left: 16px;
    background-color: rgba(var(--callout-color), 0.2);
    border-radius: 3px;
    padding-top: 0.4em;
    padding-bottom: 0.4em;
    padding-right: 0.6em;
    margin-bottom: 0.5em;

    &.cm-md-callout-info {
      --callout-color: 29, 153, 255;
    }
    &.cm-md-callout-error {
      --callout-color: 255, 83, 83;
    }
    &.cm-md-callout-warning {
      --callout-color: 255, 182, 26;
    }
    &.cm-md-callout-solution {
      --callout-color: 85, 203, 81;
    }

    .cm-md-callout-title {
      font-weight: 700;
      margin-bottom: 0.25em;
    }
  }

  :deep(.cm-md-codeblock) {
    background-color: var(
      --ink-internal-block-background-color,
      rgba(127, 127, 127, 0.12)
    );
    border-radius: 6px;
    margin: 0.5em 0;

    .cm-md-code-tools {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.35em;
      padding: 0.3em 0.5em 0;
    }

    .cm-md-code-lang {
      font-size: 0.75em;
      color: var(--ink-internal-syntax-comment-color, #8b949e);
      background: var(
        --ink-internal-block-background-color,
        rgba(127, 127, 127, 0.12)
      );
      padding: 0 0.4em;
      border-radius: 0.3em;
    }

    .cm-md-code-copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.6em;
      height: 1.6em;
      margin: 0;
      padding: 0;
      border: none;
      border-radius: 0.3em;
      background: transparent;
      color: var(--ink-internal-syntax-comment-color, #8b949e);
      cursor: pointer;
      transition:
        background-color 0.12s,
        color 0.12s;

      &:hover {
        background: var(
          --ink-internal-block-background-color,
          rgba(127, 127, 127, 0.15)
        );
        color: var(--ink-internal-color, #cfcfcf);
      }

      .ri {
        font-size: 1em;
        line-height: 1;
      }
    }

    pre {
      margin: 0;
      padding: 0.5em 0.75em 0.75em;
      overflow-x: auto;
      font-family: var(--ink-internal-code-font-family, monospace);
      font-size: 0.9em;
    }
  }

  :deep(.cm-md-math-render) {
    display: inline-block;
    vertical-align: middle;

    .katex-display {
      margin: 0;
    }
  }

  :deep(.cm-md-math-render-display) {
    display: block;
    text-align: center;
    margin: 0.5em 0;
  }

  :deep(.cm-md-mermaid-render) {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    margin: 0.5em 0;
    padding: 0.75em 1em;
    background: var(
      --ink-internal-block-background-color,
      rgba(127, 127, 127, 0.08)
    );
    border-radius: 6px;
  }

  :deep(.cm-md-mermaid-loading) {
    display: block;
    padding: 0.5em 0;
    color: var(--ink-internal-syntax-comment-color, #8b949e);
    font-size: 0.9em;
  }

  :deep(.cm-md-mermaid-error) {
    font-family: var(--ink-internal-code-font-family, monospace);
    white-space: pre-wrap;
    color: var(--ink-internal-syntax-comment-color, #8b949e);
    font-size: 0.9em;
  }

  :deep(.cm-md-mermaid-svg) {
    max-width: 100%;
    overflow-x: auto;

    svg {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
    }
  }

  // GFM tables.
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--local-border-color, #ccc);
    margin: 0.5em 0;

    th,
    td {
      border: 1px solid var(--local-border-color, #ccc);
      padding: 0.3em 0.6em;
      text-align: left;
    }

    th {
      font-weight: 700;
    }
  }

  // Task checkboxes (GFM task lists), styled like the editor's checkbox.
  :deep(input[type='checkbox']) {
    box-sizing: border-box;
    width: 16px;
    height: 16px;
    margin: 0 6px 0 0;
    appearance: none;
    -webkit-appearance: none;
    border: 2px solid var(--local-sub-text-color, #8a8a8a);
    border-radius: 4px;
    background: transparent;
    vertical-align: middle;

    &:checked {
      background-color: var(--task-checkbox-color, #49e272);
      border-color: var(--task-checkbox-color, #49e272);
      box-shadow: 0 0 4px 0 var(--task-checkbox-color, #49e272);
    }
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--ink-internal-color, #cfcfcf);
    margin: 0.6em 0;
  }

  :deep(img) {
    max-width: 100%;
  }

  :deep(a.AssetLink) {
    text-decoration: none;
  }
}
</style>
