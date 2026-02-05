import { assign } from './helpers/object';
import { tokenizeWithNewLines } from './helpers/string';
import { NewLine } from './value-types';
/**
 * Denormalization is splitting a text insert operation that has new lines into multiple
 * ops where each op is either a new line or a text containing no new lines.
 *
 * Why? It makes things easier when picking op that needs to be inside a block when
 * rendering to html
 *
 * Example:
 *  {insert: 'hello\n\nhow are you?\n', attributes: {bold: true}}
 *
 * Denormalized:
 *  [
 *      {insert: 'hello', attributes: {bold: true}},
 *      {insert: '\n', attributes: {bold: true}},
 *      {insert: '\n', attributes: {bold: true}},
 *      {insert: 'how are you?', attributes: {bold: true}},
 *      {insert: '\n', attributes: {bold: true}}
 *  ]
 */

export class InsertOpDenormalizer {
  static denormalize(op: any): any[] {
    if (!op || typeof op !== 'object') {
      return [];
    }

    if (typeof op.insert === 'object' || op.insert === NewLine) {
      return [op];
    }

    const newlinedArray = tokenizeWithNewLines(op.insert + '');

    if (newlinedArray.length === 1) {
      return [op];
    }

    const nlObj = assign({}, op, { insert: NewLine });

    return newlinedArray.map((line: string) => {
      if (line === NewLine) {
        return nlObj;
      }
      return assign({}, op, {
        insert: line,
      });
    });
  }
}
