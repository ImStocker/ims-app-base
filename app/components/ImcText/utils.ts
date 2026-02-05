import type { Range } from 'quill';
import type Quill from 'quill';
import type { Context } from 'quill/modules/keyboard';
import type { BlockBlot, Blot } from 'parchment';
import type { Op } from 'quill-delta';
import Delta from 'quill-delta';
import type { BlockEmbed } from 'quill/blots/block';
import type { ImcClipboard } from './ImcClipboard';
import { assert } from '../../logic/utils/typeUtils';

export function setNodeAssetIcon(node: HTMLElement, icon: string | null) {
  icon = icon ? icon : 'file-fill';
  if (node.classList.contains('asset-icon-' + icon)) {
    return;
  }
  const classes_to_delete = [...node.classList.values()].filter((x) =>
    /^asset-icon-/.test(x),
  );
  for (const cl of classes_to_delete) {
    node.classList.remove(cl);
  }
  node.classList.add('asset-icon-' + icon);
}

export const QuillKeys = {
  BACKSPACE: 'Backspace',
  TAB: 'Tab',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  RIGHT: 'ArrowRight',
  LEFT: 'ArrowLeft',
  DELETE: 'Delete',
};

export function quillAddKeyboardBindingBeforeOthers(
  quill: Quill,
  key: any,
  callback: (range: Range, context: any) => void,
  context?: any,
) {
  quill.keyboard.addBinding(key, context ?? {}, callback);
  (quill.keyboard as any).bindings[key.key].unshift(
    (quill.keyboard as any).bindings[key.key].pop(),
  );
}

export function quillGetDeltaPlainText(slice: Delta) {
  return slice
    .filter((op) => typeof op.insert === 'string')
    .map((op) => op.insert)
    .join('');
}

export function quillGetBlotDelta(elem: BlockEmbed | BlockBlot | Blot): Delta {
  if (typeof (<any>elem).delta !== 'undefined') {
    return (<any>elem).delta() as Delta;
  } else return new Delta();
}

export function quillGetLineDeltaBeforeKey(context: Context): Delta {
  const delta = quillGetBlotDelta(context.line);
  return delta.slice(0, context.offset);
}
export function quillGetLineBeforeKey(context: Context): string {
  const slice = quillGetLineDeltaBeforeKey(context);
  return quillGetDeltaPlainText(slice);
}

export function quillDeltaSame(
  delta1: Delta,
  delta2: Delta,
  ignore_last_new_line = true,
): boolean {
  if (delta1 === delta2) return true;
  if (ignore_last_new_line) {
    // Normalize last new line
    const delta1_has_last_newline =
      delta1.ops.length > 0 &&
      typeof delta1.ops[delta1.ops.length - 1].insert === 'string' &&
      /\n$/.test(delta1.ops[delta1.ops.length - 1].insert as string);
    const delta2_has_last_newline =
      delta2.ops.length > 0 &&
      typeof delta2.ops[delta2.ops.length - 1].insert === 'string' &&
      /\n$/.test(delta2.ops[delta2.ops.length - 1].insert as string);
    if (delta1_has_last_newline && !delta2_has_last_newline) {
      const delta1_last = delta1.ops[delta1.ops.length - 1].insert as string;
      delta1 = new Delta([
        ...delta1.ops.slice(0, delta1.ops.length - 1),
        ...(delta1_last.length === 1
          ? []
          : [
              {
                ...delta1.ops[delta1.ops.length - 1],
                insert: delta1_last.replace(/\n$/, ''),
              },
            ]),
      ]);
    } else if (delta2_has_last_newline && !delta1_has_last_newline) {
      const delta2_last = delta2.ops[delta2.ops.length - 1].insert as string;
      delta2 = new Delta([
        ...delta2.ops.slice(0, delta2.ops.length - 1),
        ...(delta2_last.length === 1
          ? []
          : [
              {
                ...delta2.ops[delta2.ops.length - 1],
                insert: delta2_last.replace(/\n$/, ''),
              },
            ]),
      ]);
    }
  }
  if (delta1.ops.length !== delta2.ops.length) return false;
  if (
    delta1.ops.length > 0 &&
    delta1.ops[0].insert &&
    delta2.ops[0].insert &&
    delta1.ops[0].insert.length !== delta2.ops[0].insert.length
  ) {
    return false;
  }
  if (!delta1.diff) delta1 = new Delta(delta1.ops);
  return delta1.diff(delta2).ops.length === 0;
}

export function convertHTMLToQuillDelta(quill: Quill, html: string): Delta {
  const quill_clipboard = quill.getModule('clipboard') as ImcClipboard;
  const delta = quill_clipboard.convert({
    html,
  });
  const res_ops: Op[] = [];
  for (const op of delta.ops) {
    if (op.attributes && op.attributes.align && op.insert !== '\n') {
      const block_op: Op = {
        insert: '\n',
        attributes: {
          align: op.attributes.align,
        },
      };
      const fixed_op: Op = {
        insert: op.insert,
        attributes: op.attributes,
      };
      if (typeof fixed_op.insert === 'string') {
        fixed_op.insert = fixed_op.insert.replace(/\n$/, '');
      }
      assert(fixed_op.attributes);
      delete fixed_op.attributes.align;
      if (Object.keys(fixed_op.attributes).length === 0) {
        delete fixed_op.attributes;
      }
      res_ops.push(fixed_op);
      res_ops.push(block_op);
    } else res_ops.push(op);
  }
  return new Delta(res_ops);
}

export const NUMERIC_LIST_REGEXP =
  /^(\s*(\d+\.)*)(\d+|[a-yA-Yа-юА-Ю])([.)])([\t ]+)/;
