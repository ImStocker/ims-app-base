import { syntaxTree } from '@codemirror/language';
import type { EditorState, Extension, Range } from '@codemirror/state';
import { RangeSet, StateField } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import FileManager from '../../../logic/managers/FileManager';
import type { IAppManager } from '../../../logic/managers/IAppManager';
import type { AssetPropValueFile } from '../../../logic/types/Props';
import { getLinkTargetUrl } from './links';

export function parseImagePathToFile(
  path: string,
  _fileStorageHost?: string,
): {
  FileId?: string;
  Title: string;
  Dir: string | null;
  Store: string;
} | null {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');

  /*
  Disabled: we need to have way to get file title to display it correctly

  const expectedHost = (fileStorageHost ?? '').replace(/\/+$/, '');
  // Canonical uploaded-file URLs: `{FILE_STORAGE_API_HOST}/file/{Store}/{FileId}`.
  // When the address carries a scheme+host it must match the configured
  // file-storage host; the root-relative `/file/...` form (host `/`) is always
  // accepted since it carries no host ambiguity.  Trailing `/thumb/…` and
  // query/hash parts are tolerated, so any of these addresses can be resolved
  // back to a file ref.
  const url_match = normalized.match(
    /^((?:https?:\/\/[^/?#]+\/)|\/)?file\/([^/?#]+)\/([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})(?:[/?#].*)?$/i,
  );

  if (url_match) {
    const host = (url_match[1] ?? '').toLowerCase().replace(/\/+$/, '');
    if (host && host !== '/' && expectedHost.toLowerCase() !== host) {
      return null;
    }
    return {
      Store: url_match[2],
      Dir: null,
      Title: url_match[3],
      FileId: url_match[3],
    };
  }*/

  const match = normalized.match(
    /@(.*?)(\/(.*?))?\/([^/#]*)(#([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}))?$/,
  );

  if (match) {
    return {
      Store: match[1],
      Dir: match[3],
      Title: match[4],
      FileId: match[6] ?? undefined,
    };
  }

  return null;
}

// Obsidian-style image size: a trailing `|NNN` (pixels) inside the alt text,
// e.g. `![My picture|300](url)`. In GFM table cells the pipe must be escaped
// (`![](...\|NNN)`), so an optional backslash is allowed before the separator.
const IMAGE_SIZE_RE = /\|{1,2}(\d{1,4})$/;

function parseImageSize(alt: string): { width: number | null; alt: string } {
  const match = IMAGE_SIZE_RE.exec(alt);
  if (match) {
    return {
      width: parseInt(match[1], 10),
      alt: alt.slice(0, match.index),
    };
  }
  return { width: null, alt };
}

const IMAGE_MARKDOWN_RE = /^!\[([\s\S]*?)\]\(([\s\S]*)\)$/;

function buildImageMarkdown(
  markdown: string,
  width: number | null,
  escapePipe = false,
): string | null {
  const match = IMAGE_MARKDOWN_RE.exec(markdown);
  if (!match) return null;
  const alt = parseImageSize(match[1]).alt;
  const url_part = match[2];
  // Inside a GFM table a raw `|` would split the cell into two, so table-cell
  // images escape the separator (and any `|` in the alt) as `\|`.
  const escapedAlt = escapePipe ? alt.replace(/\|/g, '\\|') : alt;
  const sep = escapePipe ? '\\|' : '|';
  if (width === null) return `![${escapedAlt}](${url_part})`;
  return `![${escapedAlt}${sep}${width}](${url_part})`;
}

interface ImageWidgetParams {
  url: string;
  width: number | null;
  from: number;
  to: number;
  markdown: string;
  getReadonly: () => boolean;
  escapePipe: boolean;
}

type PluginConfig = {
  appManager: IAppManager;
  getReadonly?: () => boolean;
  escapePipe?: boolean;
};

function isCaretInside(from: number, to: number, state: EditorState): boolean {
  return state.selection.ranges.some(
    (range) => range.from < to && range.to > from,
  );
}

const RESIZE_MIN_WIDTH = 40;

// The markdown only stores the width (`![alt|300](url)`), so the rendered height
// is always derived from the picture's own aspect ratio. Giving the `<img>`
// explicit pixel dimensions is what keeps that ratio while it is dragged: with
// only a percentage width the browser re-derives the height from the ratio and
// clamps it again, so growing the width stretched the picture sideways.
//
// There is no height cap — a picture may be enlarged up to the width its line
// (or table cell) offers, and its height follows from the ratio.

interface ImageBoxSize {
  width: number;
  height: number;
}

function naturalRatio(image: HTMLImageElement): number | null {
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    return image.naturalWidth / image.naturalHeight;
  }
  return null;
}

// Fits the requested width into the space the image may use, keeping the aspect
// ratio: the height always follows the width.
function fitImageSize(
  requestedWidth: number,
  ratio: number,
  maxWidth: number,
): ImageBoxSize {
  const max_w = Number.isFinite(maxWidth)
    ? Math.max(RESIZE_MIN_WIDTH, maxWidth)
    : Number.POSITIVE_INFINITY;
  const width = Math.min(Math.max(requestedWidth, RESIZE_MIN_WIDTH), max_w);
  return { width: Math.round(width), height: Math.round(width / ratio) };
}

function applyImageSize(
  figure: HTMLElement,
  image: HTMLImageElement,
  size: ImageBoxSize,
) {
  // Let the figure shrink-wrap the sized image instead of pinning its own width,
  // so the border and the resize handle stay glued to the picture.
  figure.style.width = '';
  image.style.width = `${size.width}px`;
  image.style.height = `${size.height}px`;
  // Safety net: should the browser still have to shrink the box (a bound we did
  // not know about), letterbox the picture rather than distort it.
  image.style.objectFit = 'contain';
}

class ImageWidget extends WidgetType {
  readonly url;
  readonly width;
  readonly from;
  readonly to;
  readonly markdown;
  readonly getReadonly;
  readonly escapePipe;

  private _resizing = false;
  private _mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private _mouseUpHandler: (() => void) | null = null;
  private _prevUserSelect = '';
  private _view: EditorView | null = null;
  private _container: HTMLElement | null = null;

  constructor({
    url,
    width,
    from,
    to,
    markdown,
    getReadonly,
    escapePipe,
  }: ImageWidgetParams) {
    super();

    this.url = url;
    this.width = width;
    this.from = from;
    this.to = to;
    this.markdown = markdown;
    this.getReadonly = getReadonly;
    this.escapePipe = escapePipe;
  }

  override eq(imageWidget: ImageWidget) {
    return (
      imageWidget.url === this.url &&
      imageWidget.width === this.width &&
      imageWidget.getReadonly() === this.getReadonly()
    );
  }

  toDOM(view: EditorView) {
    this._view = view;

    const container = document.createElement('span');
    const figure = container.appendChild(document.createElement('span'));
    const image = figure.appendChild(document.createElement('img'));

    this._container = container;

    container.setAttribute('aria-hidden', 'true');
    container.className = 'cm-image-container';
    figure.className = 'cm-image-figure';
    image.className = 'cm-image-img';
    image.src = this.url;

    // Inline element so multiple images can sit on the same line.
    container.style.display = 'inline-flex';
    container.style.verticalAlign = 'middle';
    container.style.margin = '0 0.15rem';
    container.style.maxWidth = '100%';

    figure.style.display = 'inline-block';
    figure.style.margin = '0';
    figure.style.lineHeight = '0';
    figure.style.borderRadius = 'var(--ink-internal-border-radius)';
    figure.style.overflow = 'hidden';
    figure.style.maxWidth = '100%';

    image.style.display = 'block';
    image.style.maxWidth = '100%';

    if (this.width) {
      figure.style.width = `${this.width}px`;
      image.style.width = '100%';
    }

    // Once the intrinsic size is known, size the picture from its aspect ratio.
    // Before that the width above is only a placeholder (the image has no
    // intrinsic size yet), so the real dimensions are applied on `load`.
    const applyNaturalSize = () => {
      const ratio = naturalRatio(image);
      if (!ratio) return;
      applyImageSize(
        figure,
        image,
        fitImageSize(
          this.width ?? image.naturalWidth,
          ratio,
          this.availableWidth(),
        ),
      );
    };
    image.addEventListener('load', applyNaturalSize);
    if (image.complete && image.naturalWidth > 0) applyNaturalSize();

    if (!this.getReadonly()) {
      this.attachResizeUI(figure, image);
    }

    return container;
  }

  // The width an image may occupy: the table cell it sits in, otherwise the
  // editor's content box. The widget's own ancestors are deliberately not used —
  // CodeMirror wraps widget content in content-sized boxes whose `clientWidth`
  // shrinks as the picture grows, which would clamp every drag to the current
  // size and make enlarging impossible.
  private availableWidth(): number {
    const innerWidth = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const padding =
        (Number.parseFloat(style.paddingLeft) || 0) +
        (Number.parseFloat(style.paddingRight) || 0);
      const width = element.clientWidth - padding;
      return width > 0 ? width : 0;
    };

    const cell = this._container?.closest('td, th') as HTMLElement | null;
    if (cell) {
      const width = innerWidth(cell);
      if (width > 0) return width;
    }

    const content = this._view?.contentDOM;
    if (content) {
      const width = innerWidth(content);
      if (width > 0) return width;
    }
    return Number.POSITIVE_INFINITY;
  }

  private attachResizeUI(figure: HTMLElement, image: HTMLImageElement) {
    figure.style.position = 'relative';

    const border = document.createElement('div');
    border.className = 'cm-image-resize-border';
    const handle = document.createElement('div');
    handle.className = 'cm-image-resize-handle';

    border.style.position = 'absolute';
    border.style.inset = '0';
    border.style.border = '2px solid var(--color-main-yellow)';
    border.style.pointerEvents = 'none';
    border.style.zIndex = '1';
    border.style.display = 'none';

    handle.style.position = 'absolute';
    handle.style.right = '2px';
    handle.style.bottom = '2px';
    handle.style.width = '10px';
    handle.style.height = '10px';
    handle.style.background = 'var(--color-main-yellow)';
    handle.style.borderRadius = '2px';
    handle.style.cursor = 'se-resize';
    handle.style.zIndex = '2';
    handle.style.display = 'none';

    figure.appendChild(border);
    figure.appendChild(handle);

    const show = () => {
      border.style.display = 'block';
      handle.style.display = 'block';
    };
    const hide = () => {
      if (this._resizing) return;
      border.style.display = 'none';
      handle.style.display = 'none';
    };

    figure.addEventListener('mouseenter', show);
    figure.addEventListener('mouseleave', hide);
    figure.addEventListener('dragstart', (e) => e.preventDefault());

    handle.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.commitWidth(null);
    });
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startResize(figure, image, e);
    });
  }

  private startResize(
    figure: HTMLElement,
    image: HTMLImageElement,
    evt: MouseEvent,
  ) {
    if (this._resizing) return;

    const start_page_x = evt.pageX;
    const start_page_y = evt.pageY;
    const start_rect = figure.getBoundingClientRect();
    const start_width = Math.max(1, start_rect.width);
    const start_height = Math.max(1, start_rect.height);
    // Keep the picture's proportions; fall back to the rendered box while the
    // intrinsic size is still unknown.
    const ratio = naturalRatio(image) ?? start_width / start_height;
    const maxWidth = this.availableWidth();
    let current_width = start_width;
    let dragging = false;

    this._prevUserSelect = document.body.style.userSelect;

    this._mouseMoveHandler = (e) => {
      if (!dragging) {
        // Only a real drag resizes; a plain click on the corner (e.g. the first
        // click of a double-click that resets the size) stays inert.
        if (
          Math.abs(e.pageX - start_page_x) < 3 &&
          Math.abs(e.pageY - start_page_y) < 3
        ) {
          return;
        }
        dragging = true;
        this._resizing = true;
        document.body.style.userSelect = 'none';
      }
      // The handle sits in the corner, so both axes are tracked: whichever one
      // moved further (relative to its own size) drives the scale and the other
      // follows the aspect ratio. Growing used to only change the width, and
      // the height stayed pinned to its cap, so the picture stretched sideways.
      const dx = e.pageX - start_page_x;
      const dy = e.pageY - start_page_y;
      const scale_x = dx / start_width;
      const scale_y = dy / start_height;
      const scale = Math.abs(scale_x) >= Math.abs(scale_y) ? scale_x : scale_y;
      const size = fitImageSize(start_width * (1 + scale), ratio, maxWidth);
      current_width = size.width;
      applyImageSize(figure, image, size);
    };

    this._mouseUpHandler = () => {
      if (this._mouseMoveHandler) {
        window.removeEventListener('mousemove', this._mouseMoveHandler);
      }
      if (this._mouseUpHandler) {
        window.removeEventListener('mouseup', this._mouseUpHandler);
      }
      this._mouseMoveHandler = null;
      this._mouseUpHandler = null;
      document.body.style.userSelect = this._prevUserSelect;
      this._resizing = false;
      if (dragging) {
        this.commitWidth(current_width);
      }
    };

    window.addEventListener('mousemove', this._mouseMoveHandler, {
      passive: true,
    });
    window.addEventListener('mouseup', this._mouseUpHandler, false);
  }

  private commitWidth(width: number | null) {
    const view = this._view;
    if (!view) return;
    const insert = buildImageMarkdown(this.markdown, width, this.escapePipe);
    if (!insert) return;
    view.dispatch({ changes: { from: this.from, to: this.to, insert } });
  }
}

export const imagesExtension = (config: PluginConfig): Extension => {
  const imageDecoration = (
    imageWidgetParams: ImageWidgetParams,
  ): Decoration => {
    let url = imageWidgetParams.url;
    if (url.startsWith('<') && url.endsWith('>')) {
      url = url.slice(1, -1).trim();
    }
    if (!url.startsWith('http') && !url.startsWith('data')) {
      const file = parseImagePathToFile(
        url,
        config.appManager.$env.FILE_STORAGE_API_HOST,
      );
      if (file) {
        url = config.appManager
          .get(FileManager)
          .getFileUrl(file as AssetPropValueFile);
      }
    }
    // Replace the whole `![alt|size](url)` markup with the inline image so the
    // raw text (alt, `|NNN`, target) never shows next to the rendered picture.
    return Decoration.replace({
      widget: new ImageWidget({ ...imageWidgetParams, url }),
    });
  };

  const decorate = (state: EditorState) => {
    const widgets: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
      enter: (ctx) => {
        if (ctx.type.name === 'Image') {
          const url_node = getLinkTargetUrl(ctx.node, state.doc);
          if (!url_node) return;
          const url = state.doc.sliceString(url_node.from, url_node.to);
          if (!url) return;

          // Reveal the raw markdown while the caret is inside the image span so
          // it stays editable (Obsidian-style reveal-on-edit).
          if (isCaretInside(ctx.from, ctx.to, state)) return;

          const markdown = state.doc.sliceString(ctx.from, ctx.to);
          const markdown_match = IMAGE_MARKDOWN_RE.exec(markdown);
          if (!markdown_match) return;
          const width = parseImageSize(markdown_match[1]).width;

          widgets.push(
            imageDecoration({
              url,
              width,
              from: ctx.from,
              to: ctx.to,
              markdown,
              getReadonly: config.getReadonly ?? (() => false),
              escapePipe: config.escapePipe ?? false,
            }).range(ctx.from, ctx.to),
          );
        }
      },
    });

    widgets.sort((a, b) => a.from - b.from);

    return widgets.length > 0 ? RangeSet.of(widgets) : Decoration.none;
  };

  const imagesField = StateField.define<DecorationSet>({
    create(state) {
      return decorate(state);
    },
    update(images, tr) {
      if (
        tr.docChanged ||
        tr.selection ||
        syntaxTree(tr.state) !== syntaxTree(tr.startState)
      ) {
        return decorate(tr.state);
      }

      return images.map(tr.changes);
    },
    provide(field) {
      return EditorView.decorations.from(field);
    },
  });

  return [imagesField];
};

export function imcImages(config: PluginConfig) {
  return [
    {
      type: 'default',
      value: imagesExtension(config),
    },
  ];
}
