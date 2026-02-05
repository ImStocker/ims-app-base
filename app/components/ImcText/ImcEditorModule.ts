import type { Range } from 'quill';
import type Quill from 'quill';
import {
  NUMERIC_LIST_REGEXP,
  QuillKeys,
  quillAddKeyboardBindingBeforeOthers,
  quillGetBlotDelta,
  quillGetDeltaPlainText,
  quillGetLineBeforeKey,
  quillGetLineDeltaBeforeKey,
} from './utils';
import type { Context } from 'quill/modules/keyboard';
import { QuillSources } from './quill-init';
import Delta from 'quill-delta';
import type { IImcEditorComponent } from './IImcEditorComponent';

export type ImcEditorModuleOptions = {
  getComponent: () => IImcEditorComponent;
};

export class ImcEditorModule {
  quill: Quill;
  options: ImcEditorModuleOptions;
  cursorPos: number = 0;
  modalPromises: Promise<any>[] = [];

  constructor(quill: Quill, options: ImcEditorModuleOptions) {
    this.quill = quill;
    this.options = options;
    this.quill.on('text-change', (_delta, _oldContents, _source) =>
      this._updateCursorPos(),
    );
    this.quill.on('selection-change', (_range) => this._updateCursorPos());
    this._enterLogic();
    this._fixDeletingBlockquoute();
    this._tabLogic();
    this._backtickLogic();
  }

  private _fixDeletingBlockquoute() {
    quillAddKeyboardBindingBeforeOthers(
      this.quill,
      {
        key: QuillKeys.BACKSPACE,
      },
      () => {
        this.quill.format('blockquote', false, QuillSources.USER);
        return false;
      },
      {
        format: {
          blockquote: true,
        },
        prefix: /^$/,
        suffix: /^$/,
        collapsed: true,
      },
    );
  }

  private _updateCursorPos() {
    const range = this.quill.getSelection();
    if (range == null) return;

    this.cursorPos = range.index;
  }

  addModalPromise(modal: Promise<any>) {
    this.modalPromises.push(modal);
    modal.then(() => {
      const index = this.modalPromises.indexOf(modal);
      if (index >= 0) this.modalPromises.splice(index, 1);
      if (this.modalPromises.length === 0 && !this.quill.hasFocus()) {
        this.quill.focus();
      }
    });
  }

  emitEnter(force: boolean): boolean {
    if (force || !this.options.getComponent().multiline) {
      this.options.getComponent().onEnter();
      return false;
    }
    return true;
  }

  emitEscape(): boolean {
    this.options.getComponent().onEscape();
    return true;
  }

  private _enterLogic() {
    quillAddKeyboardBindingBeforeOthers(
      this.quill,
      {
        key: QuillKeys.ENTER,
      },
      () => {
        return this.emitEnter(false);
      },
    );
    quillAddKeyboardBindingBeforeOthers(
      this.quill,
      {
        ctrlKey: true,
        key: QuillKeys.ENTER,
      },
      () => {
        return this.emitEnter(true);
      },
    );
    quillAddKeyboardBindingBeforeOthers(
      this.quill,
      {
        key: QuillKeys.ESCAPE,
      },
      () => {
        return this.emitEscape();
      },
    );
    quillAddKeyboardBindingBeforeOthers(
      this.quill,
      {
        key: QuillKeys.ENTER,
      },
      (range: Range, context: Context) => {
        if (this.options.getComponent().multiline) {
          const line_before = quillGetLineBeforeKey(context);
          const match = line_before.match(NUMERIC_LIST_REGEXP);
          if (!match) return true;

          const generate_next_insert = (val: string) => {
            return (
              match[1] +
              val +
              match[4] +
              (match[5].length > 1 && val.length > match[3].length
                ? match[5].substring(1)
                : match[5])
            );
          };
          const generate_next_val = (val: string) => {
            if (val.length === 1 && /^[a-zа-ю]$/i.test(val)) {
              return String.fromCharCode(val.charCodeAt(0) + 1);
            } else {
              return (parseInt(val) + 1).toString();
            }
          };

          this.quill.insertText(range.index, '\n', QuillSources.USER);
          this.quill.history.cutoff();
          let next_val = generate_next_val(match[3]);
          const cur_insert = generate_next_insert(next_val);
          this.quill.insertText(range.index + 1, cur_insert, QuillSources.USER);

          // Обновляем номера пунктов после списка
          let next_line = context.line.next ? context.line.next.next : null; // Skip just inserted
          let next_insert = cur_insert;
          while (next_line) {
            const next_line_delta = quillGetBlotDelta(next_line);
            const next_line_str = quillGetDeltaPlainText(next_line_delta);
            const next_match = next_line_str.match(NUMERIC_LIST_REGEXP);
            if (!next_match) break;
            if (next_insert !== next_match[0]) break;
            const next_offset = next_line.offset();
            this.quill.deleteText(
              next_offset,
              next_insert.length,
              QuillSources.USER,
            );
            next_val = generate_next_val(next_val);
            next_insert = generate_next_insert(next_val);
            this.quill.insertText(next_offset, next_insert, QuillSources.USER);
            next_line = next_line.next;
          }

          this.quill.history.cutoff();
          this.quill.setSelection(
            range.index + 1 + cur_insert.length,
            0,
            QuillSources.SILENT,
          );
          return false;
        }
        return true;
      },
      {
        collapsed: true,
      },
    );
  }

  private _tabLogic() {
    const put_tab = (range: Range) => {
      this.quill.history.cutoff();
      const delta = new Delta()
        .retain(range.index)
        .delete(range.length)
        .insert('\t');
      this.quill.updateContents(delta, QuillSources.USER);
      this.quill.history.cutoff();
      this.quill.setSelection(range.index + 1, 0, QuillSources.SILENT);
    };

    this.quill.keyboard.addBinding(
      {
        key: QuillKeys.TAB,
      },
      {
        collapsed: true,
        format: {
          table: false,
        },
      },
      (range: Range, context: Context) => {
        const line_before = quillGetLineBeforeKey(context);
        if (/^\d+[.)][\t ]*$/.test(line_before)) {
          put_tab(range);
          return false;
        } else return true;
      },
    );
    this.quill.keyboard.addBinding(
      {
        key: QuillKeys.TAB,
      },
      {
        format: {
          table: false,
        },
      },
      (range: Range, context: Context) => {
        if (context.format.table) return true;
        if (
          !(
            this.options.getComponent().multiline &&
            this.options.getComponent().allowTab
          )
        ) {
          return true;
        }
        put_tab(range);
        return false;
      },
    );
  }

  private _backtickLogic() {
    this.quill.keyboard.addBinding(
      {
        key: '`',
      },
      {
        format: {
          'code-block': false,
        },
        collapsed: true,
      },
      (range: Range, context: Context) => {
        const line_before = quillGetLineDeltaBeforeKey(context);
        const last_op = line_before.ops[line_before.ops.length - 1];

        // Inline code
        if (last_op) {
          if (!last_op.insert || typeof last_op.insert !== 'string') {
            return true;
          }
          const before_backtick = last_op.insert.lastIndexOf('`');
          const backticked_len =
            before_backtick >= 0
              ? last_op.insert.length - before_backtick - 1
              : 0;
          if (backticked_len > 0) {
            this.quill.insertText(range.index, '`', QuillSources.USER);
            this.quill.history.cutoff();

            const delta = new Delta()
              .retain(range.index - backticked_len - 1)
              .delete(1)
              .retain(backticked_len, {
                code: true,
              })
              .delete(1)
              .insert('\u200B');
            this.quill.updateContents(delta, QuillSources.USER);
            this.quill.setSelection(
              {
                index: delta.length() - 2,
                length: 0,
              },
              QuillSources.USER,
            );
            this.quill.history.cutoff();

            return false;
          }
        }

        /*
        // Block code
        {
          
          const line2 = context.line;
          const line2_content = quillGetBlotDelta(line2);
          if (line2_content.ops.length !== 1) return true;
          if (line2_content.ops[0].insert !== '``\n') return true;

          for (let line1 = line2 - 1; line1 >= 0; line1--) {
            const line1_content = quillGetBlotDelta(line1);
          }
        }*/

        return true;
      },
    );
  }

  static GetKeyboardBindings() {
    return {
      tab: null,
      'list autofill': {
        key: ' ',
        shiftKey: null,
        collapsed: true,
        format: {
          'code-block': false,
          blockquote: false,
          table: false,
        },
        prefix: /^\s*?(-|\*)$/,
        handler(this: any, range: any, context: any) {
          const { length } = context.prefix;
          const [line, offset] = this.quill.getLine(range.index);
          if (offset > length) return true;
          const value = 'bullet';
          this.quill.insertText(range.index, ' ', QuillSources.USER);
          this.quill.history.cutoff();
          const delta = new Delta()
            .retain(range.index - offset)
            .delete(length + 1)
            .retain(line.length() - 2 - offset)
            .retain(1, { list: value });
          this.quill.updateContents(delta, QuillSources.USER);
          this.quill.history.cutoff();
          this.quill.setSelection(range.index - length, QuillSources.SILENT);
          return false;
        },
      },
    };
  }
}
