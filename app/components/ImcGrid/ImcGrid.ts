import {
  AssetPropType,
  castAssetPropValueToAccount,
  castAssetPropValueToAsset,
  castAssetPropValueToBoolean,
  castAssetPropValueToEnum,
  castAssetPropValueToFloat,
  castAssetPropValueToInt,
  castAssetPropValueToString,
  castAssetPropValueToText,
  castAssetPropValueToTimestamp,
  extractSubObjectAsPlainValue,
  getAssetPropType,
  type AssetProps,
  type AssetPropsPlainObjectValue,
  type AssetPropValue,
  type AssetPropValueText,
  type AssetPropValueType,
} from '../../logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';
import validator from 'validator';
import type Quill from 'quill';

import type { ScrollableTableColumn } from '../ScrollableTable/ScrollableTable';
import { packQuillDeltaToPropValue } from '../ImcText/ImcContent';
import { convertHTMLToQuillDelta } from '../ImcText/utils';

export type ImcGridColumn = ScrollableTableColumn & PropsFormFieldDef;

export type ImcGridSelectedRange = {
  colFrom: number;
  colTo: number;
  rowFrom: number;
  rowTo: number;
};

export type ImcGridCoord = {
  row: number;
  col: number;
};

export function getRangeBetweenCoords(
  coord1: ImcGridCoord,
  coord2: ImcGridCoord,
): ImcGridSelectedRange {
  return {
    colFrom: Math.min(coord1.col, coord2.col),
    colTo: Math.max(coord1.col, coord2.col) + 1,
    rowFrom: Math.min(coord1.row, coord2.row),
    rowTo: Math.max(coord1.row, coord2.row) + 1,
  };
}

export type ImcGridRowColumn = {
  field: PropsFormFieldDef;
  formState: PropsFormState;
};

export type ImcGridRow = {
  id: string;
  values: ImcGridRowColumn[];
};

export type ImcGridChangeCell = {
  row: ImcGridRow | null; // null for new rows
  field: PropsFormFieldDef | null; // null for new cols;
  rowIndex: number;
  colIndex: number;
  changes: AssetProps[];
};

export function extractCellValue(
  formState: PropsFormState,
  field: PropsFormFieldDef,
): AssetPropsPlainObjectValue {
  return extractSubObjectAsPlainValue(formState.combined, field.propKey);
}

export function convertSelectionDataToPlainText(
  selectionData: AssetPropsPlainObjectValue[][][],
): string {
  const lines: string[] = [];
  for (const range of selectionData) {
    for (const sel of range) {
      const line: string[] = [];
      for (const val of sel) {
        const type = getAssetPropType(val as AssetPropValue);
        let cell_content: string | undefined = undefined;
        switch (type) {
          case AssetPropType.BOOLEAN:
          case AssetPropType.FLOAT:
          case AssetPropType.INTEGER:
          case AssetPropType.STRING:
          case AssetPropType.TEXT:
          case AssetPropType.TIMESTAMP:
            cell_content = castAssetPropValueToString(val as AssetPropValue);
            break;
        }
        if (
          cell_content &&
          (cell_content.indexOf('\t') >= 0 ||
            (cell_content.length > 1 &&
              cell_content[0] === '"' &&
              cell_content[cell_content.length - 1] === '"') ||
            (cell_content.length > 1 &&
              cell_content[0] === '[' &&
              cell_content[cell_content.length - 1] === ']') ||
            (cell_content.length > 1 &&
              cell_content[0] === '{' &&
              cell_content[cell_content.length - 1] === '}'))
        ) {
          cell_content = undefined;
        }
        if (cell_content === undefined) {
          cell_content = JSON.stringify(val);
        }
        line.push(cell_content);
      }
      lines.push(line.join('\t'));
    }
  }
  return lines.join('\n');
}

export function convertSelectionDataToHTMLText(
  selectionData: AssetPropsPlainObjectValue[][][],
  htmlRenderer: (value: AssetPropValue) => string,
): string {
  function convertValueToHTML(val: AssetPropsPlainObjectValue): string {
    if (val === null || val === undefined) {
      return '';
    }
    if (Array.isArray(val)) {
      return `${val.map((v) => `${convertValueToHTML(v)}`).join(', ')}`;
    }
    const type = getAssetPropType(val as AssetPropValue);
    if (type !== undefined) {
      return htmlRenderer(val as AssetPropValue);
    } else {
      return `<dl>${[...Object.entries(val)]
        .map(([key, val]) => {
          return `<dt>${validator.escape(key)}</dt><dd>${convertValueToHTML(val)}</dd>`;
        })
        .join('')}`;
    }
  }

  if (
    selectionData.length === 1 &&
    selectionData[0].length === 1 &&
    selectionData[0][0].length === 1
  ) {
    const val = selectionData[0][0][0];
    const cell_content = convertValueToHTML(val);
    return `<div data-ims-value="${validator.escape(JSON.stringify(val))}">${cell_content}</div>`;
  } else {
    const tables: string[] = [];

    for (const range of selectionData) {
      const lines: string[] = [];
      for (const sel of range) {
        const line: string[] = [];
        for (const val of sel) {
          const cell_content = convertValueToHTML(val);
          line.push(
            `<td data-ims-value="${validator.escape(JSON.stringify(val))}">${cell_content}</td>`,
          );
        }
        lines.push(line.join('\n'));
      }
      tables.push(
        `<table><tbody><tr>${lines.join('</tr><tr>')}</tr></tbody></table>`,
      );
    }
    return tables.join('\n');
  }
}

export function convertHTMLTextToSelectionContent(
  quill: Quill,
  html: string,
): {
  result: AssetPropsPlainObjectValue[][][];
  anotated: boolean;
} {
  if (!html) {
    return {
      result: [],
      anotated: false,
    };
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  const result: AssetPropsPlainObjectValue[][][] = [];
  let anotated = false;

  const tables = [...parsed.querySelectorAll('table')].filter(
    (el) => !el.matches('table table'),
  );
  if (tables.length > 0) {
    for (const table of tables) {
      const table_data: AssetPropsPlainObjectValue[][] = [];

      const rows = [...table.querySelectorAll('tr')].filter(
        (el) => !el.matches('tr tr'),
      );
      for (const row of rows) {
        const row_data: AssetPropsPlainObjectValue[] = [];

        const cols = [...row.querySelectorAll('td')].filter(
          (el) => !el.matches('td td'),
        );
        for (const col of cols) {
          let col_data: AssetPropsPlainObjectValue = '';
          let parsed_ims_data = false;
          if (col.dataset.imsValue) {
            try {
              col_data = JSON.parse(col.dataset.imsValue);
              parsed_ims_data = true;
              anotated = true;
            } catch {
              // Do nothing
            }
          }
          if (!parsed_ims_data) {
            const col_html = col.outerHTML;
            const delta = convertHTMLToQuillDelta(
              quill,
              col_html.replace(/^<td/, '<div').replace(/<\/td>$/, '</div>'),
            );
            col_data = packQuillDeltaToPropValue(delta);
          }

          row_data.push(col_data);
        }

        if (row_data.length > 0) {
          table_data.push(row_data);
        }
      }

      if (table_data.length > 0) {
        result.push(table_data);
      }
    }
  } else {
    const root_div = parsed.querySelector<HTMLElement>('body > div');
    let col_data: AssetPropsPlainObjectValue = '';
    let parsed_ims_data = false;
    if (root_div && root_div.dataset.imsValue) {
      try {
        col_data = JSON.parse(root_div.dataset.imsValue);
        parsed_ims_data = true;
        anotated = true;
      } catch {
        // Do nothing
      }
    }
    if (!parsed_ims_data) {
      const delta = convertHTMLToQuillDelta(quill, html);
      col_data = packQuillDeltaToPropValue(delta);
    }
    result.push([[col_data]]);
  }

  return {
    result,
    anotated,
  };
}

export function convertPlainTextToSelectionContent(text: string): {
  result: AssetPropsPlainObjectValue[][][];
} {
  if (!text) {
    return {
      result: [],
    };
  }

  const result: AssetPropsPlainObjectValue[][][] = [];
  let current_table: AssetPropsPlainObjectValue[][] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed_line = line.replace(/\r$/, '');
    const columns = trimmed_line.split('\t');
    const line_data: AssetPropsPlainObjectValue[] = [];
    for (const column of columns) {
      let added = false;
      if (
        column.length > 1 &&
        ((column[0] === '"' && column[column.length - 1] === '"') ||
          (column[0] === '[' && column[column.length - 1] === ']') ||
          (column[0] === '{' && column[column.length - 1] === '}'))
      ) {
        try {
          line_data.push(JSON.parse(column));
          added = true;
        } catch {
          // Do nothing
        }
      }

      if (!added) {
        const digits = column.match(/^-?\d+(\.\d+)?$/);
        if (digits) {
          if (digits[1]) line_data.push(parseFloat(column));
          else line_data.push(parseInt(column));
        } else line_data.push(column);
      }
    }
    if (
      current_table.length > 0 &&
      line_data.length !== current_table[current_table.length - 1].length
    ) {
      result.push(current_table);
      current_table = [];
    }
    current_table.push(line_data);
  }
  if (current_table.length > 0) {
    result.push(current_table);
  }

  return {
    result,
  };
}

export function convertPastedToSelectionContent(
  quill: Quill | null,
  html: string,
  text: string,
): { result: AssetPropsPlainObjectValue[][][]; anotated: boolean } {
  let parsed_html_res: AssetPropsPlainObjectValue[][][] = [];
  if (quill) {
    const parsed_html = convertHTMLTextToSelectionContent(quill, html);
    if (parsed_html.anotated) return parsed_html;
    parsed_html_res = parsed_html.result;
  }

  const parsed_text = convertPlainTextToSelectionContent(text);
  let result: AssetPropsPlainObjectValue[][][] = parsed_text.result;

  if (parsed_text.result.length === parsed_html_res.length) {
    result = [];
    for (let t = 0; t < parsed_text.result.length; t++) {
      const text_t = parsed_text.result[t];
      const html_t = parsed_html_res[t];
      if (text_t.length === html_t.length) {
        const res_t: AssetPropsPlainObjectValue[][] = [];
        for (let r = 0; r < text_t.length; r++) {
          const text_r = text_t[r];
          const html_r = html_t[r];
          if (text_r.length === html_r.length) {
            const res_r: AssetPropsPlainObjectValue[] = [];
            for (let c = 0; c < text_r.length; c++) {
              const text_c = text_r[c];
              const html_c = html_r[c];
              if (typeof text_c === 'string') {
                res_r.push(html_c);
              } else if (typeof text_c === 'number') {
                if (
                  html_c &&
                  (html_c as AssetPropValueText).Ops &&
                  (html_c as AssetPropValueText).Ops.length == 2 &&
                  (html_c as AssetPropValueText).Ops[0].insert ===
                    text_c.toString() &&
                  (html_c as AssetPropValueText).Ops[1].insert === '\n' &&
                  !(html_c as AssetPropValueText).Ops[0].attributes &&
                  (html_c as AssetPropValueText).Ops[1].attributes &&
                  (html_c as AssetPropValueText).Ops[1].attributes.align ===
                    'right' &&
                  Object.keys((html_c as AssetPropValueText).Ops[1].attributes)
                    .length === 1
                ) {
                  res_r.push(text_c);
                } else res_r.push(html_c);
              } else {
                res_r.push(text_c);
              }
            }
            res_t.push(res_r);
          } else {
            res_t.push(text_r);
          }
        }
        result.push(res_t);
      } else {
        result.push(text_t);
      }
    }
  }

  return {
    result,
    anotated: false,
  };
}

export function prepareValueForField(
  value: AssetPropsPlainObjectValue,
  fieldAcceptedTypes: AssetPropValueType[] | null,
  fieldMultiple: boolean,
): AssetPropsPlainObjectValue {
  function prepareOneValue(
    value: AssetPropsPlainObjectValue,
  ): AssetPropsPlainObjectValue {
    if (!fieldAcceptedTypes || fieldAcceptedTypes.length === 0) return value;

    const prepared_type = getAssetPropType(value as AssetPropValue);
    for (const accepted of fieldAcceptedTypes) {
      if (accepted.Type === prepared_type) {
        return value;
      }
    }

    if (!prepared_type) {
      value = JSON.stringify(value);
    }
    switch (fieldAcceptedTypes[0].Type) {
      case AssetPropType.STRING:
        return castAssetPropValueToString(value as AssetPropValue);
      case AssetPropType.TEXT:
        return packQuillDeltaToPropValue({
          ops: castAssetPropValueToText(value as AssetPropValue).Ops,
        });
      case AssetPropType.INTEGER:
        return castAssetPropValueToInt(value as AssetPropValue);
      case AssetPropType.FLOAT:
        return castAssetPropValueToFloat(value as AssetPropValue);
      case AssetPropType.BOOLEAN:
        return castAssetPropValueToBoolean(value as AssetPropValue);
      case AssetPropType.TIMESTAMP:
        return castAssetPropValueToTimestamp(value as AssetPropValue);
      case AssetPropType.ENUM:
        return castAssetPropValueToEnum(value as AssetPropValue);
      case AssetPropType.ACCOUNT:
        return castAssetPropValueToAccount(value as AssetPropValue);
      case AssetPropType.ASSET:
        return castAssetPropValueToAsset(value as AssetPropValue);
    }
    return value;
  }

  const prepared = Array.isArray(value)
    ? value.map((v) => prepareOneValue(v))
    : prepareOneValue(value);
  if (fieldMultiple && !Array.isArray(prepared)) {
    return [prepared] as AssetPropValue[];
  } else if (!fieldMultiple && Array.isArray(prepared)) {
    return prepared.length > 0 ? prepared[0] : null;
  }

  return prepared as AssetPropsPlainObjectValue;
}
