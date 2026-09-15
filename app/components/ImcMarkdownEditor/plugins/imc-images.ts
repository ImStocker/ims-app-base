import { syntaxTree } from '@codemirror/language';
import type { EditorState, Extension, Range } from '@codemirror/state';
import { RangeSet, StateField } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import FileManager from '../../../logic/managers/FileManager';
import type { IAppManager } from '../../../logic/managers/IAppManager';
import type { AssetPropValueFile } from '../../../logic/types/Props';

function parseImagePathToFile(path: string): {
  FileId?: string;
  Title: string;
  Dir: string | null;
  Store: string;
} | null {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');

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
// e.g. `![My picture|300](url)`.
const IMAGE_SIZE_RE = /\|(\d{1,4})$/;

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
): string | null {
  const match = IMAGE_MARKDOWN_RE.exec(markdown);
  if (!match) return null;
  const alt = parseImageSize(match[1]).alt;
  const url_part = match[2];
  if (width === null) return `![${alt}](${url_part})`;
  return `![${alt}|${width}](${url_part})`;
}

interface ImageWidgetParams {
  url: string;
  width: number | null;
  from: number;
  to: number;
  markdown: string;
  getReadonly: () => boolean;
}

type PluginConfig = {
  appManager: IAppManager;
  getReadonly?: () => boolean;
};

function isCaretInside(from: number, to: number, state: EditorState): boolean {
  return state.selection.ranges.some(
    (range) => range.from < to && range.to > from,
  );
}

const RESIZE_MIN_WIDTH = 40;

class ImageWidget extends WidgetType {
  readonly url;
  readonly width;
  readonly from;
  readonly to;
  readonly markdown;
  readonly getReadonly;

  private _resizing = false;
  private _mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private _mouseUpHandler: (() => void) | null = null;
  private _prevUserSelect = '';
  private _view: EditorView | null = null;

  constructor({
    url,
    width,
    from,
    to,
    markdown,
    getReadonly,
  }: ImageWidgetParams) {
    super();

    this.url = url;
    this.width = width;
    this.from = from;
    this.to = to;
    this.markdown = markdown;
    this.getReadonly = getReadonly;
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
    image.style.maxHeight = 'var(--ink-internal-block-max-height)';
    image.style.maxWidth = '100%';

    if (this.width) {
      figure.style.width = `${this.width}px`;
      image.style.width = '100%';
    }

    if (!this.getReadonly()) {
      this.attachResizeUI(figure);
    }

    return container;
  }

  private attachResizeUI(figure: HTMLElement) {
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
      this.startResize(figure, e);
    });
  }

  private startResize(figure: HTMLElement, evt: MouseEvent) {
    if (this._resizing) return;

    const start_page_x = evt.pageX;
    const start_width = figure.getBoundingClientRect().width;
    let current_width = start_width;
    let dragging = false;

    this._prevUserSelect = document.body.style.userSelect;

    this._mouseMoveHandler = (e) => {
      if (!dragging) {
        // Only a real drag resizes; a plain click on the corner (e.g. the first
        // click of a double-click that resets the size) stays inert.
        if (Math.abs(e.pageX - start_page_x) < 3) return;
        dragging = true;
        this._resizing = true;
        document.body.style.userSelect = 'none';
      }
      current_width = Math.max(
        RESIZE_MIN_WIDTH,
        Math.round(start_width + (e.pageX - start_page_x)),
      );
      figure.style.width = `${current_width}px`;
      figure.style.maxWidth = '100%';
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
    const insert = buildImageMarkdown(this.markdown, width);
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
      const file = parseImagePathToFile(url);
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
          const url_node = ctx.node.getChild('URL');
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
