import type { Range } from 'quill';
import Quill from 'quill';
import { debounceForThis } from '../utils/ComponentUtils';
import { QuillKeys, quillAddKeyboardBindingBeforeOthers } from './utils';
import type { EmitterSource } from 'quill/core';
import { Delta } from 'quill/core';
import type { Context } from 'quill/modules/keyboard';

export type ImcLinkOption = {
  type: 'asset' | 'user';
  value: string;
  title: string;
  raw: any;
  blockId?: string;
  anchor?: string;
};

type MentionType = 'asset' | 'mention';

type MentionInput = {
  type: MentionType;
  text: string;
};

export interface ImcLinkDrowdownInterface {
  setShown: (val: boolean) => void;
  setOptions: (options: ImcLinkOption[], hasMore: boolean) => void;
  setLoading: (loading: boolean, error: string | null) => void;
  setTextBounds: (x: number, y: number, height: number) => void;
  setSearchText: (val: string) => void;
  selectCurrent: () => void;
  handleKey: (key: string) => boolean;
}

export type ImcLinksModuleOptions = {
  loadOptions: (
    type: MentionType,
    query: string,
  ) => Promise<{ list: ImcLinkOption[]; more: boolean }>;
  dropdown: ImcLinkDrowdownInterface;
};

const MAX_LOOKUP = 100;
const CACHE_TIME = 60 * 1000;

type CacheRecord = {
  query: string;
  options: { list: ImcLinkOption[]; more: boolean };
  time: number;
};

export class ImcLinksModule {
  quill: Quill;
  options: ImcLinksModuleOptions;
  cursorPos: number = 0;
  currentMentionMark: string = '';
  cancelledFor: string = '';
  dropdownShown: boolean = false;
  dropdownLoading: boolean = false;
  dropdownOptions: { list: ImcLinkOption[]; more: boolean } = {
    list: [],
    more: false,
  };
  skipNextTextChange = false;

  private _showMentions: (mention: MentionInput) => void;
  private _cache = {
    asset: [] as CacheRecord[],
    mention: [] as CacheRecord[],
  };

  constructor(quill: Quill, options: ImcLinksModuleOptions) {
    this.quill = quill;
    this.options = options;
    this.quill.on('text-change', (delta, oldContents, source) =>
      this._onTextChange(delta, oldContents, source),
    );
    this.quill.on('selection-change', (range) =>
      this._onSelectionChange(range),
    );
    this._showMentions = debounceForThis((mention: MentionInput) => {
      this._showMentionsNow(mention);
    }, 300);

    this.quill.keyboard.addBinding({ key: QuillKeys.UP }, () => {
      if (this.dropdownShown) {
        return this.options.dropdown.handleKey(QuillKeys.UP);
      }
      return true;
    });
    this.quill.keyboard.addBinding({ key: QuillKeys.DOWN }, () => {
      if (this.dropdownShown) {
        return this.options.dropdown.handleKey(QuillKeys.DOWN);
      }
      return true;
    });
    this.quill.keyboard.addBinding({ key: QuillKeys.RIGHT }, () => {
      if (this.dropdownShown) {
        return this.options.dropdown.handleKey(QuillKeys.RIGHT);
      }
      return true;
    });
    quillAddKeyboardBindingBeforeOthers(
      this.quill,
      { key: QuillKeys.ENTER },
      () => {
        if (this.dropdownShown) {
          this.options.dropdown.selectCurrent();
          return false;
        }
        return true;
      },
    );
    quillAddKeyboardBindingBeforeOthers(
      this.quill,
      { key: QuillKeys.TAB },
      () => {
        if (this.dropdownShown) {
          this.options.dropdown.selectCurrent();
          return false;
        }
        return true;
      },
    );
    this.quill.keyboard.addBinding({ key: QuillKeys.ESCAPE }, () => {
      if (this.dropdownShown) {
        const mention = this._getCursorMention();
        this._hideMentions();
        if (mention) {
          this.cancelledFor = mention.type + mention.text;
        } else this.cancelledFor = '';
        return false;
      }
      return true;
    });
    this.quill.keyboard.addBinding(
      { key: ['#', '№', '@'], shiftKey: true },
      (range: Range, _context: Context) => {
        this.skipNextTextChange = true;
        this.cursorPos = range.index + 1;
        this._showMentions({
          text: '',
          type: 'asset',
        });
        return true;
      },
    );
  }

  removeCurrentMarker() {
    const current_mention = this._getCursorMention();
    if (current_mention) {
      const delta = new Delta();
      const cursor_change = this.cursorPos - current_mention.text.length - 1;
      delta.retain(cursor_change);
      delta.delete(current_mention.text.length + 1);
      this.quill.updateContents(delta, Quill.sources.USER);
      this.quill.setSelection(cursor_change, 0, Quill.sources.USER);
      return false;
    }
  }

  insertImcLink(link: ImcLinkOption) {
    const delta = new Delta();
    let cursor_change = this.cursorPos;
    delta.retain(this.cursorPos);
    if (link.type === 'asset') {
      delta.insert(link.title, {
        asset: {
          value: {
            AssetId: link.value,
            Title: link.raw.title,
            Name: link.raw.name,
            BlockId: link.blockId,
            Anchor: link.anchor,
          },
          icon: link.raw.icon,
        },
      });
      cursor_change += link.title.length;
    }
    delta.insert(' ');
    cursor_change++;
    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.setSelection(cursor_change, 0, Quill.sources.USER);
  }

  private _onTextChange(
    delta: Delta,
    oldContents: Delta,
    source: EmitterSource,
  ) {
    if (this.skipNextTextChange) {
      this.skipNextTextChange = false;
      return;
    }
    if (source === 'user') {
      this._onSomethingChange();
    }
  }

  private _onSelectionChange(range: Range) {
    if (range && range.length === 0) {
      this._onSomethingChange();
    } else {
      this._hideMentions();
    }
  }

  private _getCursorMention(): MentionInput | null {
    const startPos = Math.max(0, this.cursorPos - MAX_LOOKUP);
    const contentBeforeCursor = this.quill.getContents(
      startPos,
      this.cursorPos - startPos,
    );
    let textBeforeCursor = '';
    for (let ind = contentBeforeCursor.ops.length - 1; ind >= 0; ind--) {
      const op = contentBeforeCursor.ops[ind];
      if (op.attributes && op.attributes.asset) {
        break;
      }
      if (op.insert && typeof op.insert === 'string') {
        textBeforeCursor = op.insert + textBeforeCursor;
      }
    }

    const matches = [...textBeforeCursor.matchAll(/[#@№\n]/g)];
    if (matches.length === 0) return null;
    const last = matches[matches.length - 1];
    const ch = last[0];
    if (ch === '\n') return null;
    if (textBeforeCursor[(last.index ?? 0) + 1] === ' ') {
      return null;
    } else if (
      last.index &&
      last.index > 0 &&
      !/[ \n,.!?]/.test(textBeforeCursor[last.index - 1])
    ) {
      return null;
    }
    return {
      type: 'asset',
      text: textBeforeCursor.substring((last.index ?? 0) + 1),
    };
  }

  private _onSomethingChange() {
    const range = this.quill.getSelection();
    if (range == null) return;

    this.cursorPos = range.index;
    const mention = this._getCursorMention();
    if (mention) {
      this.options.dropdown.setSearchText(mention.text);
      this._showMentions(mention);
    } else {
      this.options.dropdown.setSearchText('');
      this._hideMentions();
    }
  }

  private _hideMentions() {
    this.currentMentionMark = '';
    this.options.dropdown.setShown(false);
    this.options.dropdown.setLoading(false, null);
    this.options.dropdown.setOptions([], false);
    this.dropdownLoading = false;
    this.dropdownOptions = { list: [], more: false };
    this.cancelledFor = '';
    this.dropdownShown = false;
  }

  private async _loadOptions(
    mention: MentionInput,
  ): Promise<{ list: ImcLinkOption[]; more: boolean }> {
    const min_time = Date.now() - CACHE_TIME;
    const mt_search = mention.text.toLowerCase();
    this._cache[mention.type] = this._cache[mention.type].filter((x) => {
      return x.time > min_time;
    });
    let best: CacheRecord | null = null;
    for (const cr of this._cache[mention.type]) {
      if (cr.query === mention.text) {
        best = cr;
        break;
      } else if (
        mt_search.includes(cr.query) &&
        (!best || best.query.length < cr.query.length)
      ) {
        best = cr;
      }
    }

    if (best) {
      if (best.query === mt_search) {
        return best.options;
      } else if (best.options.list.length === 0) {
        return {
          list: [],
          more: false,
        };
      }
    }

    const opts = await this.options.loadOptions(mention.type, mention.text);
    this._cache[mention.type].push({
      time: Date.now(),
      options: opts,
      query: mt_search,
    });
    return opts;
  }

  private async _showMentionsNow(mention: MentionInput) {
    const mark = mention.type + mention.text;
    if (this.cancelledFor) {
      if (mark.startsWith(this.cancelledFor)) {
        return;
      }
    }

    try {
      this.currentMentionMark = mark;
      this.options.dropdown.setLoading(true, null);
      this.dropdownLoading = true;
      const options = await this._loadOptions(mention);
      if (mark === this.currentMentionMark) {
        this.options.dropdown.setLoading(false, null);
        const bounds = this.quill.getBounds(
          this.cursorPos - mention.text.length,
        );
        this.options.dropdown.setOptions(options.list, options.more);
        if (bounds) {
          this.options.dropdown.setTextBounds(
            bounds.left,
            bounds.top,
            bounds.height,
          );
        }
        this.dropdownShown = true;
        this.dropdownLoading = false;
        this.dropdownOptions = options;
        this.cancelledFor = '';
      }
      this.options.dropdown.setShown(true);
    } catch (err: any) {
      if (mark === this.currentMentionMark) {
        this.options.dropdown.setLoading(false, err.message);
        this.dropdownLoading = false;
        this.dropdownOptions = {
          list: [],
          more: false,
        };
        this.dropdownShown = true;
        this.cancelledFor = '';
      }
    }
  }
}
