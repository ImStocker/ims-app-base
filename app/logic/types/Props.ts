import type { AssetPropsSelectionOrder } from './PropsSelection';
import type { AssetPropWhere } from './PropsWhere';

export enum AssetPropType {
  NULL = 'null',
  BOOLEAN = 'boolean',
  STRING = 'string',
  INTEGER = 'integer',
  FLOAT = 'float',
  ARRAY = 'array',
  TEXT = 'text',
  FILE = 'file',
  BLOB = 'blob',
  FORMULA = 'formula',
  ASSET = 'asset',
  ACCOUNT = 'account',
  SELECTION = 'selection',
  ENUM = 'enum',
  PROJECT = 'project',
  WORKSPACE = 'workspace',
  TIMESTAMP = 'timestamp',
  TYPE = 'type',
}

export type AssetPropValueTextOp = {
  insert?: any;
  attributes?: any;
};

export type AssetPropValueText = {
  Str: string;
  Ops: AssetPropValueTextOp[];
};

export type AssetPropValueFile = {
  FileId: string;
  Title: string;
  Size: number;
  Dir: string | null;
  Store: string;
};

export type AssetPropValueBlob = {
  Blob: string;
  Type: string;
  Key?: string;
};

export type AssetPropValueFormula = {
  F: any;
};

export type AssetPropValueAsset = {
  AssetId: string;
  Title: string;
  Name: string | null;
  Pid?: string;
  BlockId?: string | null;
  Anchor?: string | null;
};

export type AssetPropValueAccount = {
  AccountId: string;
  Name: string;
};

export type AssetPropValueEnum = {
  Enum: string;
  Name: string;
  Title: string;
};

export type AssetPropValueProject = {
  ProjectId: string;
  Title: string;
};

export type AssetPropValueTimestamp = {
  Str: string;
  Ts: number;
};

export type AssetPropValueWorkspace = {
  WorkspaceId: string;
  Title: string;
  Name: string | null;
  Pid?: string;
};

export type AssetPropValueSelection = {
  Str: string;
  Where: AssetPropWhere;
  Order?: AssetPropsSelectionOrder[];
  Offset?: number;
  Count?: number;
};

export type AssetPropValueType = {
  Type: AssetPropType;
  Kind?: string;
  Of?: AssetPropValueType;
};

export type AssetPropValue =
  | null
  | string
  | number
  | boolean
  | number[]
  | AssetPropValueText
  | AssetPropValueFile
  | AssetPropValueBlob
  | AssetPropValueFormula
  | AssetPropValueAsset
  | AssetPropValueAccount
  | AssetPropValueSelection
  | AssetPropValueEnum
  | AssetPropValueProject
  | AssetPropValueTimestamp
  | AssetPropValueWorkspace
  | AssetPropValueType;

export type AssetPropValueNested =
  | AssetPropValue
  | { [prop: string]: AssetPropValueNested }
  | AssetPropValueNested[];

export type AssetProps = Record<string, AssetPropValue>;
export type AssetPropsNested = Record<string, AssetPropValueNested>;
export type AssetPropBlocks = Record<string, AssetProps>;
export type AssetPropBlocksChange = Record<string, AssetProps | AssetProps[]>;

export function castDateToAssetPropValueTimestamp(
  date: Date,
): AssetPropValueTimestamp {
  return {
    Str: date.toISOString(),
    Ts: date.getTime() / 1000,
  };
}

export function getNowAssetPropValueTimestamp(): AssetPropValueTimestamp {
  return castDateToAssetPropValueTimestamp(new Date());
}

export function castAssetPropValueToTimestamp(
  a: AssetPropValue,
): AssetPropValueTimestamp | null {
  if (a === null) return null;

  const a_type = getAssetPropType(a);
  if (a_type === AssetPropType.TIMESTAMP) {
    return a as AssetPropValueTimestamp;
  } else if (
    a_type === AssetPropType.INTEGER ||
    a_type === AssetPropType.FLOAT
  ) {
    const val_ms = (a as number) * 1000;
    const date = new Date(val_ms);
    return {
      Str: date.toISOString(),
      Ts: val_ms,
    };
  } else {
    const str = castAssetPropValueToString(a);
    const date = new Date(str);
    if (isNaN(date.getTime())) return null;
    return {
      Str: date.toISOString(),
      Ts: date.getTime() / 1000,
    };
  }
}

export function castAssetPropValueToDate(a: AssetPropValue): Date | null {
  const timestamp = castAssetPropValueToTimestamp(a);
  return timestamp ? new Date(timestamp.Ts * 1000) : null;
}

export function castAssetPropValueToText(
  a: AssetPropValue,
): AssetPropValueText {
  if (
    a &&
    (a as AssetPropValueText).Str !== undefined &&
    (a as AssetPropValueText).Ops
  ) {
    return a as AssetPropValueText;
  }
  const str = castAssetPropValueToString(a);
  const a_type = getAssetPropType(a);
  switch (a_type) {
    case AssetPropType.ASSET:
      return {
        Ops: [
          {
            insert: (a as AssetPropValueAsset).Title,
            attributes: {
              asset: {
                value: {
                  Title: null,
                  Name: null,
                  ...(a as Partial<AssetPropValueAsset>),
                },
              },
            },
          },
        ],
        Str: str,
      };
    case AssetPropType.FILE:
      return {
        Ops: [
          {
            insert: {
              file: {
                value: a as AssetPropValueFile,
                inline: false,
              },
            },
          },
        ],
        Str: str,
      };
    case AssetPropType.ACCOUNT:
    case AssetPropType.BLOB:
    case AssetPropType.ENUM:
    case AssetPropType.FORMULA:
    case AssetPropType.PROJECT:
    case AssetPropType.SELECTION:
    case AssetPropType.TIMESTAMP:
    case AssetPropType.WORKSPACE:
      return {
        Ops: [
          {
            insert: {
              prop: {
                value: a,
                inline: true,
              },
            },
          },
        ],
        Str: str,
      };

    default: {
      const has_new_line_end = /\n$/.test(str);
      return {
        Ops: [
          {
            insert: str + (has_new_line_end ? '' : '\n'),
          },
        ],
        Str: str + (has_new_line_end ? '' : '\n'),
      };
    }
  }
}

export function joinAssetPropValueTexts(
  text1: AssetPropValue,
  ...values: AssetPropValue[]
): AssetPropValueText {
  let res = castAssetPropValueToText(text1);
  for (const val of values) {
    const text = castAssetPropValueToText(val);
    res = {
      Ops: [...res.Ops, ...text.Ops],
      Str: res.Str + text.Str,
    };
  }
  return res;
}

export function* walkAssetPropValueTextOps(
  ops: AssetPropValueTextOp[],
): Generator<{
  op: AssetPropValueTextOp;
  insertProp?: { value: AssetPropValue };
  insertTask?: { value: AssetPropValueAsset };
  insertFile?: { value: AssetPropValueFile };
  attributeAsset?: { value: AssetPropValueAsset };
}> {
  if (!(ops as unknown)) return;
  for (const op of ops) {
    yield {
      op,
      insertProp:
        op.insert && op.insert.prop && op.insert.prop.value !== undefined
          ? op.insert.prop
          : undefined,
      insertTask:
        op.insert &&
        op.insert.task &&
        op.insert.task.value !== undefined &&
        (op.insert.task.value as AssetPropValueAsset).AssetId
          ? op.insert.task
          : undefined,
      insertFile:
        op.insert &&
        op.insert.file &&
        op.insert.file.value !== undefined &&
        (op.insert.file.value as AssetPropValueFile).FileId
          ? op.insert.file
          : undefined,
      attributeAsset:
        op.attributes &&
        op.attributes.asset &&
        op.attributes.asset.value !== undefined &&
        (op.attributes.asset.value as AssetPropValueAsset).AssetId
          ? op.attributes.asset
          : undefined,
    };
  }
}

export function truncateAssetPropValueText(
  val: AssetPropValueText,
  length: number,
): { result: AssetPropValueText; truncated: boolean } {
  const res_ops: AssetPropValueTextOp[] = [];
  let res_len = 0;
  let truncated = false;
  let p = 0;
  while (p < val.Ops.length && res_len < length) {
    const op = val.Ops[p];
    if (op.insert && typeof op.insert === 'string') {
      if (op.insert.length <= length - res_len) {
        res_ops.push(op);
        res_len += op.insert.length;
      } else {
        truncated = true;
        res_ops.push({
          ...op,
          insert: op.insert.substring(0, length - res_len),
        });
        res_len = length;
      }
    } else {
      res_ops.push(op);
      res_len++;
    }
    p++;
  }
  return {
    result: {
      Ops: res_ops,
      Str: convertAssetPropValueTextOpsToStr(res_ops).str,
    },
    truncated: truncated || p < val.Ops.length,
  };
}

export function makeTitleFromAssetPropValue(a: AssetPropValue): {
  str: string;
  strip: boolean;
} {
  const a_type = getAssetPropType(a);
  switch (a_type) {
    case AssetPropType.TEXT: {
      const str: string[] = [];
      let strip = false;
      for (const op_struct of walkAssetPropValueTextOps(
        (a as AssetPropValueText).Ops,
      )) {
        if (!op_struct.op.insert) continue;
        if (op_struct.insertTask) {
          str.push(`#${op_struct.insertTask.value.Title ?? ''}`);
          strip = true;
        } else if (op_struct.insertFile) {
          str.push(`[${op_struct.insertFile.value.Title ?? 'file'}]`);
          strip = true;
        } else if (op_struct.insertProp) {
          const prop = makeTitleFromAssetPropValue(op_struct.insertProp.value);
          str.push(prop.str);
          strip = strip || prop.strip;
        } else if (typeof op_struct.op.insert === 'object') {
          strip = true;
        } else if (op_struct.attributeAsset) {
          str.push(op_struct.op.insert);
          strip = true;
        } else {
          str.push(op_struct.op.insert);
        }
      }
      return {
        str: str.join(''),
        strip,
      };
    }
    case AssetPropType.BLOB:
      return {
        str: '[blob]',
        strip: true,
      };
    case AssetPropType.FILE:
      return {
        str: `[${(a as AssetPropValueFile).Title ?? 'file'}]`,
        strip: true,
      };
    case AssetPropType.ACCOUNT:
      return {
        str: `@${(a as AssetPropValueAccount).Name ?? ''}`,
        strip: true,
      };
    case AssetPropType.ASSET:
      return {
        str: (a as AssetPropValueAsset).Title
          ? (a as AssetPropValueAsset).Title
          : ((a as AssetPropValueAsset).Name ?? ''),
        strip: true,
      };
    case AssetPropType.WORKSPACE:
      return {
        str: (a as AssetPropValueWorkspace).Title
          ? (a as AssetPropValueWorkspace).Title
          : ((a as AssetPropValueWorkspace).Name ?? ''),
        strip: true,
      };
    case AssetPropType.PROJECT:
      return {
        str: (a as AssetPropValueProject).Title
          ? (a as AssetPropValueProject).Title
          : ((a as AssetPropValueProject).ProjectId ?? ''),
        strip: true,
      };
    case AssetPropType.FORMULA:
      return {
        str: '[formula]',
        strip: true,
      };
    case AssetPropType.SELECTION:
      return {
        str: '[selection]',
        strip: true,
      };
    case AssetPropType.ENUM:
      return {
        str: (a as AssetPropValueEnum).Title,
        strip: true,
      };
    default:
      return {
        str: castAssetPropValueToString(a),
        strip: false,
      };
  }
}

export function castAssetPropValueToEnum(
  a: AssetPropValue,
): AssetPropValueEnum | null {
  if (!a) return null;
  if (!(a as AssetPropValueEnum).Enum) return null;
  return a as AssetPropValueEnum;
}

export function castAssetPropValueToAccount(
  a: AssetPropValue,
): AssetPropValueAccount | null {
  if (!a) return null;
  if (!(a as AssetPropValueAccount).AccountId) return null;
  return a as AssetPropValueAccount;
}

export function castAssetPropValueToAsset(
  a: AssetPropValue,
): AssetPropValueAsset | null {
  if (!a) return null;
  if ((a as AssetPropValueAsset).AssetId) {
    return a as AssetPropValueAsset;
  }
  let val = a;
  if ((a as AssetPropValueText).Ops) {
    val = convertAssetPropValueTextOpsToStr((a as AssetPropValueText).Ops).str;
  }

  val = castAssetPropValueToString(val).trim();
  if (!val) return null;
  const val_text_match = val.match(
    /^\[(.*?)\]\(#asset:(.*?)(?:#block:([^#~)]*)(?:~anchor:([^)]*))?)?\)$/,
  );

  if (val_text_match) {
    const [_, title, asset_id, block_id, anchor_id] = val_text_match;
    return {
      Title: title,
      AssetId: asset_id,
      Name: null,
      BlockId: block_id,
      Anchor: anchor_id,
    };
  }

  return null;
}

export function castAssetPropValueToArray(a: AssetPropValue): number[] {
  return Array.isArray(a) ? (a as number[]) : [];
}

export function castAssetPropValueToString(a: AssetPropValue): string {
  const a_type = getAssetPropType(a);
  switch (a_type) {
    case undefined:
    case AssetPropType.NULL:
      return '';
    case AssetPropType.TEXT:
      return (a as AssetPropValueText).Str;
    case AssetPropType.TIMESTAMP:
      return (a as AssetPropValueTimestamp).Str;
    case AssetPropType.INTEGER:
    case AssetPropType.FLOAT:
    case AssetPropType.STRING:
      return (a as any).toString();
    case AssetPropType.BOOLEAN:
      return a ? '1' : '0';
    case AssetPropType.BLOB:
      return `[](#blob:${(a as AssetPropValueBlob).Type}:${
        (a as AssetPropValueBlob).Blob
      })`;
    case AssetPropType.FILE:
      return `[${(a as AssetPropValueFile).Title ?? ''}](#file:${
        (a as AssetPropValueFile).FileId
      })`;
    case AssetPropType.ACCOUNT:
      return `[${(a as AssetPropValueAccount).Name ?? ''}](#account:${
        (a as AssetPropValueAccount).AccountId
      })`;
    case AssetPropType.ARRAY:
      // NOTE: При переводе в строку одиночных значений мы не можем получить значения массива, поэтому выводим только кол-во
      return `array[${(a as number[]).length}]`;
    case AssetPropType.ASSET:
      return `[${
        (a as AssetPropValueAsset).Title
          ? (a as AssetPropValueAsset).Title
          : ((a as AssetPropValueAsset).Name ?? '')
      }](#asset:${(a as AssetPropValueAsset).AssetId}${
        (a as AssetPropValueAsset).BlockId
          ? '#block:' +
            (a as AssetPropValueAsset).BlockId +
            ((a as AssetPropValueAsset).Anchor
              ? '~anchor:' + (a as AssetPropValueAsset).Anchor
              : '')
          : ''
      })`;
    case AssetPropType.WORKSPACE:
      return `[${
        (a as AssetPropValueWorkspace).Title
          ? (a as AssetPropValueWorkspace).Title
          : ((a as AssetPropValueWorkspace).Name ?? '')
      }](#workspace:${(a as AssetPropValueWorkspace).WorkspaceId})`;
    case AssetPropType.PROJECT:
      return `[${
        (a as AssetPropValueProject).Title
          ? (a as AssetPropValueProject).Title
          : ((a as AssetPropValueProject).ProjectId ?? '')
      }](#project:${(a as AssetPropValueProject).ProjectId})`;
    case AssetPropType.FORMULA:
    case AssetPropType.SELECTION:
      return JSON.stringify(a);
    case AssetPropType.ENUM:
      return (a as AssetPropValueEnum).Name;
    case AssetPropType.TYPE: {
      const ofval = (a as AssetPropValueType).Of;
      return (
        (a as AssetPropValueType).Type +
        ((a as AssetPropValueType).Kind
          ? `:${(a as AssetPropValueType).Kind}`
          : ``) +
        (ofval ? `[${castAssetPropValueToString(ofval)}]` : ``)
      );
    }
  }
}

export function castAssetPropPlainObjectValueToString(
  a: AssetPropsPlainObjectValue,
): string {
  if (Array.isArray(a)) {
    return a.map((b) => castAssetPropPlainObjectValueToString(b)).join(', ');
  } else {
    const a_type = getAssetPropType(a as AssetPropValue);
    if (a && a_type === undefined && typeof a === 'object') {
      return JSON.stringify(a);
    } else return castAssetPropValueToString(a as AssetPropValue);
  }
}

export function castAssetPropValueToBoolean(a: AssetPropValue): boolean {
  return a !== undefined && a !== null && a !== 0 && a !== '' && a !== false;
}

export function castAssetPropValueToInt(a: AssetPropValue): number | null {
  if (typeof a === 'number') {
    return Math.round(a);
  } else if (typeof a === 'boolean') {
    return a ? 1 : 0;
  }
  if (a && (a as AssetPropValueTimestamp).Ts) {
    return Math.round((a as AssetPropValueTimestamp).Ts);
  }
  const a_str = castAssetPropValueToString(a);
  const r = parseInt(a_str);
  return isNaN(r) ? null : r;
}

export function castAssetPropValueToFloat(a: AssetPropValue): number | null {
  if (typeof a === 'number') {
    return a;
  }
  if (a && (a as AssetPropValueTimestamp).Ts) {
    return (a as AssetPropValueTimestamp).Ts;
  }
  const a_str = castAssetPropValueToString(a);
  const r = parseFloat(a_str);
  return isNaN(r) ? null : r;
}

export function validateAssetPropValue(v: any): AssetPropValue {
  if (v === undefined) {
    throw new Error('Property value is undefined');
  }
  const a = v as AssetPropValue;
  const valid = getAssetPropType(a);
  if (!valid) throw new Error('Invalid property value: ' + JSON.stringify(v));
  return a;
}

export function getAssetPropType(v: AssetPropValue): AssetPropType | undefined {
  if (v === undefined || v === null) return AssetPropType.NULL;
  else if (typeof v === 'string') return AssetPropType.STRING;
  else if (typeof v === 'boolean') return AssetPropType.BOOLEAN;
  else if (typeof v === 'number') {
    return Number.isInteger(v) ? AssetPropType.INTEGER : AssetPropType.FLOAT;
  } else if (Array.isArray(v)) return AssetPropType.ARRAY;
  else if (typeof v === 'object') {
    if (
      Array.isArray((v as AssetPropValueText).Ops) &&
      typeof (v as AssetPropValueText).Str === 'string'
    ) {
      return AssetPropType.TEXT;
    } else if (
      typeof (v as AssetPropValueFile).FileId === 'string' &&
      typeof (v as AssetPropValueFile).Title === 'string' &&
      typeof (v as AssetPropValueFile).Size === 'number'
    ) {
      return AssetPropType.FILE;
    } else if (
      typeof (v as AssetPropValueTimestamp).Ts === 'number' &&
      typeof (v as AssetPropValueTimestamp).Str === 'string'
    ) {
      return AssetPropType.TIMESTAMP;
    } else if (
      typeof (v as AssetPropValueBlob).Blob === 'string' &&
      typeof (v as AssetPropValueBlob).Type === 'string'
    ) {
      return AssetPropType.BLOB;
    } else if (
      typeof (v as AssetPropValueEnum).Enum === 'string' &&
      typeof (v as AssetPropValueEnum).Name === 'string'
    ) {
      return AssetPropType.ENUM;
    } else if (typeof (v as AssetPropValueFormula).F === 'object') {
      return AssetPropType.FORMULA;
    } else if (typeof (v as AssetPropValueAsset).AssetId === 'string') {
      return AssetPropType.ASSET;
    } else if (typeof (v as AssetPropValueWorkspace).WorkspaceId === 'string') {
      return AssetPropType.WORKSPACE;
    } else if (typeof (v as AssetPropValueProject).ProjectId === 'string') {
      return AssetPropType.PROJECT;
    } else if (typeof (v as AssetPropValueAccount).AccountId === 'string') {
      return AssetPropType.ACCOUNT;
    } else if (typeof (v as AssetPropValueType).Type === 'string') {
      return AssetPropType.TYPE;
    } else if (Array.isArray((v as AssetPropValueSelection).Where)) {
      return AssetPropType.SELECTION;
    }
  }
  return undefined;
}

function _jsonCompare(obj1: any, obj2: any) {
  if (obj1 === undefined && obj2 !== undefined) {
    return -1;
  } else if (obj1 !== undefined && obj2 === undefined) {
    return 1;
  } else {
    function jsonSorter(key: string, value: any) {
      if (value === null) {
        return null;
      }
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).sort());
      }
      return value;
    }
    const json1 = JSON.stringify(obj1, jsonSorter);
    const json2 = JSON.stringify(obj2, jsonSorter);
    return json1.localeCompare(json2);
  }
}

function _compareAssetPropValuesTexts(
  ac: AssetPropValueText,
  bc: AssetPropValueText,
) {
  const str_compare = ac.Str.localeCompare(bc.Str);
  if (str_compare !== 0) {
    return str_compare;
  }
  if (ac.Ops.length !== bc.Ops.length) {
    return ac.Ops.length < bc.Ops.length ? -1 : 1;
  }
  for (let i = 0; i < ac.Ops.length; i++) {
    const aop = ac.Ops[i];
    const bop = bc.Ops[i];
    if (aop.insert === undefined && bop.insert !== undefined) {
      return -1;
    }
    if (aop.insert !== undefined && bop.insert === undefined) {
      return 1;
    } else if (aop.insert !== undefined && bop.insert !== undefined) {
      if (typeof aop.insert === 'string' && typeof bop.insert === 'string') {
        const ins_comp = aop.insert.localeCompare(bop.insert);
        if (ins_comp !== 0) return ins_comp;
      } else {
        const json_compare = _jsonCompare(aop.insert, bop.insert);
        if (json_compare !== 0) return json_compare;
      }
    }
    if (aop.attributes === undefined && bop.attributes !== undefined) {
      return -1;
    }
    if (aop.attributes !== undefined && bop.attributes === undefined) {
      return 1;
    } else if (aop.attributes !== undefined && bop.attributes !== undefined) {
      const json_compare = _jsonCompare(aop.attributes, bop.attributes);
      if (json_compare !== 0) return json_compare;
    }
  }
  return 0;
}

export function compareAssetPropValues(
  a: AssetPropValue | undefined,
  b: AssetPropValue | undefined,
  exact = true,
): number {
  const an = a ?? null;
  const bn = b ?? null;
  if (an === null && bn === null) return 0;
  if (an === bn) return 0;
  if (an === null) return -1;
  if (bn === null) return 1;
  const a_type = getAssetPropType(an);
  const b_type = getAssetPropType(an);
  if (a_type === b_type) {
    switch (a_type) {
      case undefined:
        return -1;
      case AssetPropType.NULL:
      case AssetPropType.INTEGER:
      case AssetPropType.FLOAT:
      case AssetPropType.BOOLEAN:
        return an === bn ? 0 : an < bn ? -1 : 1;
      case AssetPropType.STRING:
        return (an as string).localeCompare(bn as string);
      case AssetPropType.TIMESTAMP:
        return (an as AssetPropValueTimestamp).Str.localeCompare(
          (bn as AssetPropValueTimestamp).Str,
        );
      case AssetPropType.TEXT: {
        return _compareAssetPropValuesTexts(
          a as AssetPropValueText,
          b as AssetPropValueText,
        );
      }
      case AssetPropType.BLOB: {
        const ac = a as AssetPropValueBlob;
        const bc = b as AssetPropValueBlob;
        if (ac.Type === bc.Type) {
          return ac.Blob.localeCompare(bc.Blob);
        } else return ac.Type.localeCompare(bc.Type);
      }
      case AssetPropType.FILE: {
        const ac = a as AssetPropValueFile;
        const bc = b as AssetPropValueFile;
        const mcomp = ac.FileId.localeCompare(bc.FileId);
        if (mcomp === 0) {
          return 0;
        } else {
          const scomp = ac.Title.localeCompare(bc.Title);
          if (scomp === 0) return mcomp;
          return scomp;
        }
      }
      case AssetPropType.ACCOUNT: {
        const ac = a as AssetPropValueAccount;
        const bc = b as AssetPropValueAccount;
        const mcomp = ac.AccountId.localeCompare(bc.AccountId);
        if (mcomp === 0) {
          return 0;
        } else {
          const scomp = ac.Name.localeCompare(bc.Name);
          if (scomp === 0) return mcomp;
          return scomp;
        }
      }
      case AssetPropType.ARRAY: {
        const ac = a as number[];
        const bc = b as number[];
        if (ac.length === bc.length) {
          // NOTE: При сравнении одиночных значений мы не можем проверить равенство массивов
          return -1;
        } else {
          return ac.length - bc.length;
        }
      }
      case AssetPropType.ASSET: {
        const ac = a as AssetPropValueAsset;
        const bc = b as AssetPropValueAsset;
        const mcomp = ac.AssetId.localeCompare(bc.AssetId);
        if (mcomp === 0) {
          return 0;
        } else {
          let scomp = ac.Title.localeCompare(bc.Title);
          if (scomp === 0) {
            scomp = (ac.Name ?? '').localeCompare(bc.Name ?? '');
            if (scomp === 0) return mcomp;
          }
          return scomp;
        }
      }
      case AssetPropType.WORKSPACE: {
        const ac = a as AssetPropValueWorkspace;
        const bc = b as AssetPropValueWorkspace;
        const mcomp = ac.WorkspaceId.localeCompare(bc.WorkspaceId);
        if (mcomp === 0) {
          return 0;
        } else {
          let scomp = ac.Title.localeCompare(bc.Title);
          if (scomp === 0) {
            scomp = (ac.Name ?? '').localeCompare(bc.Name ?? '');
            if (scomp === 0) return mcomp;
          }
          return scomp;
        }
      }
      case AssetPropType.PROJECT: {
        const ac = a as AssetPropValueProject;
        const bc = b as AssetPropValueProject;
        const mcomp = ac.ProjectId.localeCompare(bc.ProjectId);
        if (mcomp === 0) {
          return 0;
        } else {
          const scomp = ac.Title.localeCompare(bc.Title);
          if (scomp === 0) return mcomp;
          return scomp;
        }
      }
      case AssetPropType.FORMULA:
      case AssetPropType.SELECTION: {
        return _jsonCompare(a, b);
      }
      case AssetPropType.ENUM: {
        const ac = a as AssetPropValueEnum;
        const bc = b as AssetPropValueEnum;
        const mcomp = ac.Enum.localeCompare(bc.Enum);
        if (mcomp === 0) {
          return ac.Name.localeCompare(bc.Name);
        } else return mcomp;
      }
      case AssetPropType.TYPE: {
        const ac = a as AssetPropValueType;
        const bc = b as AssetPropValueType;
        const mcomp = ac.Type.localeCompare(bc.Type);
        if (mcomp === 0) {
          const akind = ac.Kind ?? '';
          const bkind = bc.Kind ?? '';
          const kindcomp = akind.localeCompare(bkind);
          if (kindcomp === 0) {
            const aof = ac.Of ?? null;
            const bof = bc.Of ?? null;
            return compareAssetPropValues(aof, bof);
          } else return kindcomp;
        } else return mcomp;
      }
    }
  } else {
    const a_str = castAssetPropValueToString(an);
    const b_str = castAssetPropValueToString(an);
    const comp = a_str.localeCompare(b_str);
    if (comp === 0 && exact) {
      return -1;
    }
    return comp;
  }
}

export function sameAssetPropValues(
  a: AssetPropValue | undefined,
  b: AssetPropValue | undefined,
  exact = true,
): boolean {
  return compareAssetPropValues(a, b, exact) === 0;
}

export function sameAssetPropObjects(
  a: AssetProps,
  b: AssetProps,
  exact = true,
): boolean {
  const a_keys = Object.keys(a);
  const b_keys = Object.keys(b);
  if (a_keys.length !== b_keys.length) return false;
  for (const a_key of a_keys) {
    if (!b.hasOwnProperty(a_key)) return false;
    if (Array.isArray(a[a_key]) && Array.isArray(b[a_key])) {
      continue; // При сравнении объектов равенство массивов проверяется по ключам
    }
    const same = compareAssetPropValues(a[a_key], b[a_key], exact) === 0;
    if (!same) return false;
  }
  return true;
}

export function encodeAssetPropPartWithCapitals(id: string) {
  return normalizeAssetPropPart(
    id
      .split('')
      .map((s) => {
        const low = s.toLowerCase();
        if (low === s) return low + low;
        else return '_' + low;
      })
      .join(''),
  );
}

export function normalizeAssetPropIdentifier(id: string) {
  if (!id) return '';
  return id.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeAssetPropPart(part: string) {
  const norm = normalizeAssetPropIdentifier(part);
  const res = norm
    .replace(/\\+/g, '')
    .replace(/^~+/, '')
    .replace(/[[\]()/,]/g, '')
    .replace(/[\s_]+/g, '_');
  if (/^\d+$/.test(res)) return `_${res}`;
  else return res;
}

export function splitPropParts(prop: string): string[] {
  return prop.split('\\');
}

export function isCheckedAssetPropValue(v: AssetPropValue): boolean {
  return isFilledAssetPropValue(v) && v !== false && v !== 0;
}

export function isFilledAssetPropValue(v: AssetPropValue): boolean {
  const type = getAssetPropType(v);
  switch (type) {
    case AssetPropType.NULL:
      return false;
    case AssetPropType.STRING:
      return !!v && !!v.toString().trim();
    case AssetPropType.TEXT: {
      const text = v as AssetPropValueText;
      if (text.Str) return true;
      if (text.Ops.length === 0) return false;
      if (
        typeof text.Ops[0].insert === 'string' &&
        !text.Ops[0].insert.trim()
      ) {
        return false;
      }
      return true;
    }
    case AssetPropType.ARRAY:
      return (v as number[]).length > 0;
  }
  return true;
}

export function getAssetPropsChildNames(
  props: AssetProps,
  root = '',
): string[] {
  const res: string[] = [];
  for (const key of Object.keys(props)) {
    const spl = splitPropParts(key);
    if (spl.length < 2) continue;
    if (spl[0] === root) res.push(spl[1]);
  }
  return [...new Set(res)];
}

export function joinAssetPropPathToKey(prop_path: string[]): string {
  return prop_path.map((x) => normalizeAssetPropPart(x)).join('\\');
}

export function extractAssetPropsSubObject(
  props: AssetProps,
  root = '',
): AssetProps {
  if (!props || typeof props !== 'object') {
    return {};
  }

  const nested_props: AssetProps = {};
  const root_is_array = Array.isArray(props[root]);
  let has_sub = false;
  for (const [key, val] of Object.entries(props)) {
    if (key === root) {
      nested_props[''] = val;
    } else if (key.startsWith(root + '\\')) {
      const rest_key = key.substring(root.length + 1);
      const is_array_key = /^-?\d+(.\d+)?(\\|$)/.test(rest_key);
      const sub_key = (is_array_key ? '\\' : '') + rest_key;
      nested_props[sub_key] = val;
      has_sub = true;
    } else if (key.startsWith('~' + root + '\\')) {
      const rest_key = key.substring(root.length + 1 + 1);
      const is_array_key = /^-?\d+(.\d+)?(\\|$)/.test(rest_key);
      const sub_key = '~' + (is_array_key ? '\\' : '') + rest_key;
      let changed_val = val ? castAssetPropValueToString(val) : null;
      if (changed_val) {
        if (changed_val.startsWith(root + '\\')) {
          const changed_val_rest_key = changed_val.substring(root.length + 1);
          const changed_val_is_array_key = /^-?\d+(.\d+)?(\\|$)/.test(
            changed_val_rest_key,
          );
          changed_val =
            (changed_val_is_array_key ? '\\' : '') + changed_val_rest_key;
        }
      }
      nested_props[sub_key] = changed_val;
      has_sub = true;
    }
  }
  if (nested_props.hasOwnProperty('') && has_sub && !root_is_array) {
    delete nested_props[''];
  }
  return nested_props;
}

export function assignSubObjectToAssetProps(
  target: AssetProps,
  value: AssetProps,
  prefix = '',
): AssetProps {
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith('~')) {
      const need_sep = key && !/^~\\/.test(key);
      const prefixed_val = val
        ? (prefix ? prefix + (need_sep ? '\\' : '') : '') + val
        : null;
      target[
        '~' + (prefix ? prefix + (need_sep ? '\\' : '') : '') + key.substring(1)
      ] = prefixed_val;
    } else {
      const need_sep = key && !/^\\/.test(key);
      target[(prefix ? prefix + (need_sep ? '\\' : '') : '') + key] = val;
    }
  }
  return target;
}

export type AssetPropsPlainObjectValue =
  | AssetPropValue
  | AssetPropValue[]
  | AssetPropsPlainObject
  | AssetPropsPlainObject[];

export type AssetPropsPlainObject = {
  [key: string]: AssetPropsPlainObjectValue;
};

export function convertAssetPropsToPlainObject<T extends AssetPropsPlainObject>(
  props: AssetProps,
): T {
  if (!props) return {} as unknown as T;

  let res: any = {};
  const nested: any = {};
  const digits = new Set<number>();
  let any_nested = false;
  let any_not_digit = false;
  const props_entries = Object.entries(props);
  for (const [key, val] of props_entries) {
    const parts = key.split('\\');
    const is_digit = /^-?\d+(\.\d+)?$/.test(parts[0]);
    if (is_digit) digits.add(parseInt(parts[0]));
    else any_not_digit = true;

    if (parts.length === 1) {
      res[parts[0]] = val;
    } else {
      if (nested.hasOwnProperty(parts[0])) {
        nested[parts[0]][parts.slice(1).join('\\')] = val;
      } else {
        nested[parts[0]] = {
          [parts.slice(1).join('\\')]: val,
        };
      }
      any_nested = true;
    }
  }
  if (any_nested) {
    for (const [key, n] of Object.entries(nested)) {
      res[key] = convertAssetPropsToPlainObject(n as any);
    }
  }
  if (props_entries.length > 0 && digits.size > 0 && !any_not_digit) {
    const digits_arr = [...digits];
    digits_arr.sort((a, b) => a - b);
    const arr: string[] = [];
    for (const d of digits_arr) {
      arr.push(res[d]);
    }
    res = arr;
  }
  return res;
}

export function extractSubObjectAsPlainValue<
  T extends AssetPropsPlainObjectValue,
>(props: AssetProps, root = ''): T {
  let plain_data: AssetPropsPlainObjectValue;
  const sub_object = extractAssetPropsSubObject(props, root);
  if (sub_object.hasOwnProperty('')) {
    if (Array.isArray(sub_object[''])) {
      const arr = convertAssetPropsToPlainObject(sub_object);
      plain_data = Array.isArray(arr['']) ? arr[''] : [];
    } else {
      plain_data = sub_object[''];
    }
  } else {
    plain_data =
      Object.keys(sub_object).length > 0
        ? convertAssetPropsToPlainObject(sub_object)
        : null;
  }
  return plain_data as T;
}

export function assignPlainValueToAssetProps(
  target: AssetProps,
  value: AssetPropsPlainObjectValue,
  prefix = '',
): AssetProps {
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      target[prefix] = value.map((v, index) => index);
      for (let index = 0; index < value.length; index++) {
        assignPlainValueToAssetProps(
          target,
          value[index],
          (prefix ? prefix + '\\' : '') + index,
        );
      }
    } else {
      const type = getAssetPropType(value as any);
      if (type === undefined) {
        for (const [key, val] of Object.entries(
          value as Record<string, AssetPropValue>,
        )) {
          assignPlainValueToAssetProps(
            target,
            val as AssetPropsPlainObject,
            (prefix ? prefix + '\\' : '') + key,
          );
        }
      } else {
        target[prefix] = value as AssetPropValue;
      }
    }
  } else if (
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'undefined'
  ) {
    // Do nothing
  } else {
    target[prefix] = value;
  }
  return target;
}

export function convertAssetPropValueTextOpsToStr(
  ops: AssetPropValueTextOp[],
): { str: string; plain: boolean } {
  const str: string[] = [];
  let plain = true;
  for (const op_struct of walkAssetPropValueTextOps(ops)) {
    if (typeof op_struct.op.insert !== 'string') {
      plain = false;
      if (op_struct.op.insert) {
        if ((op_struct.op.insert as any).file) {
          str.push(
            ((op_struct.op.insert as any).file.inline ? '!' : '') +
              castAssetPropValueToString(
                (op_struct.op.insert as any).file.value,
              ),
          );
        } else if ((op_struct.op.insert as any).task) {
          str.push(
            castAssetPropValueToString((op_struct.op.insert as any).task.value),
          );
        }
      }
      continue;
    }
    if (op_struct.op.attributes) {
      plain = false;
    }
    if (op_struct.attributeAsset) {
      str.push(
        `[${op_struct.op.insert.replace(/[[\]]/g, (x) => '\\' + x)}](#asset:${
          op_struct.attributeAsset.value.AssetId
        }${
          op_struct.attributeAsset.value.BlockId
            ? '#block:' +
              op_struct.attributeAsset.value.BlockId +
              (op_struct.attributeAsset.value.Anchor
                ? '~anchor:' + op_struct.attributeAsset.value.Anchor
                : '')
            : ''
        })`,
      );
    } else {
      str.push(op_struct.op.insert);
    }
  }

  return {
    str: str.join(''),
    plain,
  };
}

//NEW
export type AssetBlockIdWithName = {
  blockName: string | null;
  blockId: string | null;
};

export type AssetBlockIdWithNameAndProp = AssetBlockIdWithName & {
  propKey: string;
};

export function stringifyAssetNewBlockRef(
  block_name: string | null,
  block_id: string | null,
) {
  if (!block_name && !block_id) {
    throw new Error(
      'Block name and id cannot be null in same time to generate block ref',
    );
  }
  return (block_name ?? '') + (block_id ? '@' + block_id : '');
}

export function makeBlockRef(
  block_name: string | null,
  block_id: string,
): string;
export function makeBlockRef(block: {
  id: string;
  name: string | null;
}): string;
export function makeBlockRef(
  block_or_name: string | null | { id: string; name: string | null },
  block_id?: string,
): string {
  let block_name: string | null;
  if (block_or_name && typeof block_or_name === 'object') {
    block_name = block_or_name.name;
    block_id = block_or_name.id;
  } else block_name = block_or_name as string | null;
  return block_name ? block_name : `@${block_id}`;
}

export function parseAssetNewBlockRef(block_ref: string): AssetBlockIdWithName {
  let block_id: string | null = null;
  let block_name: string | null = null;
  const reg_exp = /^(.*?)(@(.*))?$/;
  if (block_ref && block_ref.length > 0) {
    const res = reg_exp.exec(block_ref);
    if (res) {
      block_id = res[3] ? res[3] : null;
      block_name = res[1] ? res[1] : null;
    } else {
      block_name = block_ref;
    }
  } else {
    throw new Error(
      'Invalid AssetBlockKeyRef: ' + block_id + ' - must have 1 symbol',
    );
  }

  return {
    blockId: block_id,
    blockName: block_name,
  };
}

export function parseAssetNewBlockPropKeyRef(
  ref: string,
): AssetBlockIdWithNameAndProp {
  const ref_splitted = ref.split('|');
  if (ref_splitted.length < 2) {
    throw new Error(
      'Invalid AssetBlockPropKeyRef: ' + ref + ' - too few parts',
    );
  }

  const vals = parseAssetNewBlockRef(ref_splitted[0]);
  return {
    blockName: vals.blockName,
    blockId: vals.blockId,
    propKey: normalizeAssetPropIdentifier(ref_splitted.slice(1).join('|')),
  };
}

const DeletingKeyRegexp = /^~(.*)$/;

export function remapAssetProps(
  props: AssetProps,
  remap: Record<string, string | null>,
): AssetProps {
  const res = {
    ...props,
  };
  for (const prop_key of Object.keys(props)) {
    let prop_changed_specificity = -1;
    let new_prop_name: null | string = null;
    for (const [remap_key, remap_val] of Object.entries(remap)) {
      if (prop_changed_specificity >= remap_key.length) {
        continue;
      }
      if (
        remap_key === prop_key ||
        prop_key.startsWith(remap_key + '\\') ||
        remap_key === ''
      ) {
        if (remap_val) {
          new_prop_name = remap_val + prop_key.substring(remap_key.length);
        } else {
          new_prop_name = null;
        }
        prop_changed_specificity = remap_key.length;
      }
    }
    if (prop_changed_specificity >= 0) {
      if (new_prop_name !== null) {
        res[new_prop_name] = props[prop_key];
      }
      delete res[prop_key];
    }
  }

  return res;
}

export function mergeInheritedProps(
  inherited: AssetProps,
  props: AssetProps,
): AssetProps {
  let base = inherited ? inherited : {};
  if (!props) props = {};
  const overlay = {
    ...props,
  };
  let remap: Record<string, string | null> | null = null;
  for (const key of Object.keys(props)) {
    const del_key_match = key.match(DeletingKeyRegexp);
    if (del_key_match) {
      if (!remap) remap = {};
      delete overlay[key];
      remap[del_key_match[1]] =
        props[key] !== null ? castAssetPropValueToString(props[key]) : null;
    }
  }
  if (remap) {
    base = remapAssetProps(base, remap);
  }
  return {
    ...base,
    ...overlay,
  };
}

function escapeRegExp(str: string): string {
  return (str || '').toString().replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}

export function isPropInherited(
  prop: string,
  props: AssetProps,
  inherited: AssetProps,
): boolean {
  let remapped_res: boolean | undefined = undefined;
  let remapped_specificity = -1;
  for (const key of Object.keys(props)) {
    if (remapped_specificity > key.length) continue;

    const del_key_match = key.match(DeletingKeyRegexp);
    if (del_key_match) {
      if (props[key] === null) {
        if (
          del_key_match[1] === prop ||
          del_key_match[1] === '' ||
          prop.startsWith(del_key_match[1] + '\\')
        ) {
          remapped_res = false;
          remapped_specificity = key.length;
        }
      } else if (props[key] === prop || prop.startsWith(props[key] + '\\')) {
        remapped_res = true;
        remapped_specificity = key.length;
      }
    }
  }
  if (remapped_res !== undefined) return remapped_res;
  return inherited.hasOwnProperty(prop);
}

export function applyPropsChange(
  currentProps: AssetProps,
  inheritedProps: AssetProps | null,
  changes: AssetProps[],
): {
  props: AssetProps;
  undo: AssetProps[];
} {
  type ApplyPropsChangeParsed = {
    deleting: string[];
    restoringSet: Set<string>;
    ranaming: { oldname: string; newname: string }[];
    parentRedirects: { prop: string; val?: string; delete?: true }[];
    overlay: AssetProps;
  };

  type ParentRedirectState = {
    prop: string;
    oldval: string | null;
    newval: string | null;
  };

  function parseChange(change: AssetProps): ApplyPropsChangeParsed {
    const res: ApplyPropsChangeParsed = {
      deleting: [],
      restoringSet: new Set(),
      ranaming: [],
      parentRedirects: [],
      overlay: {},
    };
    for (const [prop, val] of Object.entries(change)) {
      if (prop[0] === '~') {
        const ch_prop = prop.substring(1);
        if (val === null || val === true) {
          if (val === true) {
            res.restoringSet.add(ch_prop);
          }
          if (prop[1] === '~') {
            res.parentRedirects.push({
              prop: ch_prop.substring(1),
              delete: true,
            });
          } else {
            res.deleting.push(ch_prop);
          }
        } else if (typeof val === 'string') {
          if (prop[1] === '~') {
            // ~~ for changing
            const parent_prop = ch_prop.substring(1);
            if (parent_prop !== val) {
              res.parentRedirects.push({
                prop: parent_prop,
                val,
              });
            }
          } else {
            if (val !== ch_prop) {
              res.ranaming.push({
                newname: val,
                oldname: ch_prop,
              });
            }
          }
        } else {
          throw new Error(
            'Unexpected value for changing/deleting prop ' + prop,
          );
        }
      } else {
        res.overlay[prop] = val;
      }
    }
    return res;
  }

  const result = {
    props: { ...currentProps },
    undo: [] as AssetProps[],
  };
  if (changes.length === 0) {
    return result;
  }

  for (const props_change of changes) {
    const old_vals = { ...result.props };
    const undo_change: AssetProps = {};

    const parsed_change = parseChange(props_change);
    const parent_redirects = {
      map: new Map<string, ParentRedirectState>(),
      list: [] as ParentRedirectState[],
    };
    const deleting_undo_props = new Set<string>();

    // Parent redirects before
    for (const [key, val] of Object.entries(result.props)) {
      if (DeletingKeyRegexp.test(key)) {
        const val_prep = val !== null ? castAssetPropValueToString(val) : null;
        const pr_rec: ParentRedirectState = {
          prop: key.substring(1),
          oldval: val_prep,
          newval: val_prep,
        };
        parent_redirects.map.set(pr_rec.prop, pr_rec);
        parent_redirects.list.push(pr_rec);
      }
    }

    // Change parent redirects
    for (const pr_change of parsed_change.parentRedirects) {
      let pr_rec = parent_redirects.map.get(pr_change.prop);
      if (pr_change.delete) {
        if (!pr_rec) continue;

        pr_rec.newval = pr_rec.prop;
        if (result.props['~' + pr_change.prop] === null) {
          addDeletedInUndo(pr_change.prop);
        }
        undo_change['~' + pr_change.prop] = result.props['~' + pr_change.prop];
        delete result.props['~' + pr_change.prop];
      } else {
        if (pr_rec) {
          if (pr_change.val !== pr_rec.oldval) {
            if (pr_change.val) {
              if (pr_rec.oldval === null) {
                addDeletedInUndo(pr_change.val);
              }
              undo_change['~' + pr_change.val] = pr_rec.oldval;
            } else {
              undo_change['~~' + pr_change.prop] = pr_rec.oldval;
            }
            pr_rec.newval = pr_change.val ?? null;
            result.props['~' + pr_change.prop] = pr_change.val ?? null;
          }
        } else {
          undo_change['~~' + pr_change.prop] = null;
          result.props['~' + pr_change.prop] = pr_change.val ?? null;
          pr_rec = {
            prop: pr_change.prop,
            newval: pr_change.val ?? null,
            oldval: pr_change.prop,
          };
          parent_redirects.list.push(pr_rec);
          parent_redirects.map.set(pr_rec.prop, pr_rec);
        }
      }
    }

    parent_redirects.list.sort((a, b) => b.prop.length - a.prop.length); // Longer has more priority

    function redirectParentProp(prop: string, rename_only = false) {
      for (const pr_rec of parent_redirects.list) {
        if (prop === pr_rec.prop || prop.startsWith(pr_rec.prop + '\\')) {
          if ((rename_only && pr_rec.newval !== null) || !rename_only) {
            return {
              oldname:
                pr_rec.oldval !== null
                  ? pr_rec.oldval + prop.substring(pr_rec.prop.length)
                  : null,
              newname:
                pr_rec.newval !== null
                  ? pr_rec.newval + prop.substring(pr_rec.prop.length)
                  : null,
            };
          }
        }
      }
      return {
        oldname: prop,
        newname: prop,
      };
    }

    function isDeletedInUndo(prop: string): boolean {
      for (const delp of deleting_undo_props) {
        if (delp === '' || delp === prop || prop.startsWith(delp + '\\')) {
          return true;
        }
      }
      return false;
    }
    function addDeletedInUndo(prop: string) {
      if (!deleting_undo_props.has(prop)) {
        deleting_undo_props.add(prop);
        for (const [undo_p, undo_v] of Object.entries(undo_change)) {
          if (
            undo_v === null &&
            (prop === '' || undo_p === prop || undo_p.startsWith(prop + '\\'))
          ) {
            delete undo_change[undo_p];
          }
        }
      }
    }

    for (const p of parsed_change.deleting) {
      // Deleting own properties
      for (const [oldn, _oldv] of Object.entries(old_vals)) {
        if (oldn[0] === '~') continue;
        if (p === oldn || oldn.startsWith(p + '\\') || p === '') {
          undo_change[oldn] = old_vals[oldn];
          delete result.props[oldn];
        }
      }
      // Deleteing parent properties
      if (!parsed_change.restoringSet.has(p) && inheritedProps) {
        let delete_parent_key = null as null | string;
        let delete_parent_key_undo: AssetPropValue | undefined = undefined;
        for (const oldn of Object.keys(inheritedProps)) {
          const oldn_red = redirectParentProp(oldn, true);

          if (
            oldn_red.newname &&
            (p === oldn_red.newname ||
              oldn_red.newname.startsWith(p + '\\') ||
              p === '')
          ) {
            delete_parent_key = oldn.substring(
              0,
              oldn.length - oldn_red.newname.substring(p.length).length,
            );
            if (
              delete_parent_key_undo === undefined &&
              oldn_red.oldname !== null
            ) {
              delete_parent_key_undo = result.props.hasOwnProperty(
                `~${delete_parent_key}`,
              )
                ? result.props[`~${delete_parent_key}`]
                : null;
            }

            if (p !== oldn_red.newname) {
              const oldn_appendix = oldn
                .substring(
                  delete_parent_key
                    ? delete_parent_key.length + '\\'.length
                    : 0,
                )
                .split('\\');
              for (let oa_i = oldn_appendix.length - 1; oa_i >= 0; oa_i--) {
                const oa_key =
                  (delete_parent_key ? delete_parent_key + '\\' : '') +
                  oldn_appendix.slice(0, oa_i + 1).join('\\');
                const oa_red = redirectParentProp(oa_key, true);
                if (
                  oa_red.newname &&
                  (p === oa_red.newname ||
                    oa_red.newname.startsWith(p + '\\') ||
                    p === '')
                ) {
                  if (result.props.hasOwnProperty(`~${oa_key}`)) {
                    if (result.props[`~${oa_key}`] !== null) {
                      if (!isDeletedInUndo(oa_key)) {
                        undo_change[`~~${oa_key}`] = result.props[`~${oa_key}`];
                      }
                    } else {
                      if (
                        oa_red.oldname !== null &&
                        !isDeletedInUndo(oa_red.oldname)
                      ) {
                        undo_change[`~${oa_red.oldname}`] = null;
                      }
                    }
                    delete result.props[`~${oa_key}`];
                  }
                }
              }
            }
          }
        }
        if (delete_parent_key !== null) {
          if (delete_parent_key_undo !== undefined) {
            if (!isDeletedInUndo(delete_parent_key)) {
              undo_change[`~~${delete_parent_key}`] = delete_parent_key_undo;
            }
          }
          result.props[`~${delete_parent_key}`] = null;
        }
      }
    }
    const renamed_keys = new Map<string, string>();
    for (const { newname, oldname } of parsed_change.ranaming) {
      let has_any_renamed = false;
      const redirected_ranamed = false;

      // Rename own properties
      for (const [oldn, oldv] of Object.entries(old_vals)) {
        if (oldn[0] === '~') continue;
        if (oldname === oldn || oldn.startsWith(oldname + '\\')) {
          const new_nested_name = newname + oldn.substring(oldname.length);
          result.props[new_nested_name] = oldv;
          delete result.props[oldn];
          renamed_keys.set(new_nested_name, oldn);
          has_any_renamed = true;
        }
      }

      // Rename parent properties
      if (!redirected_ranamed && inheritedProps) {
        let has_parent_renamed_key = null as null | string;
        for (const oldn of Object.keys(inheritedProps)) {
          const oldn_red = redirectParentProp(oldn);

          if (
            oldn_red.newname !== null &&
            (oldn_red.newname === oldname ||
              oldn_red.newname.startsWith(oldname + '\\'))
          ) {
            const new_nested_name =
              newname + oldn_red.newname.substring(oldname.length);
            if (new_nested_name === oldn) {
              delete result.props[`~${oldn}`];
            } else {
              if (result.props.hasOwnProperty(`~${oldn}`)) {
                result.props[`~${oldn}`] = new_nested_name;
              }
            }
            has_parent_renamed_key = oldn.substring(
              0,
              oldn.length - oldn_red.newname.substring(oldname.length).length,
            );
          }
        }

        if (has_parent_renamed_key !== null) {
          if (has_parent_renamed_key === newname) {
            delete result.props[`~${has_parent_renamed_key}`];
          } else {
            result.props[`~${has_parent_renamed_key}`] = newname;
          }
          has_any_renamed = true;
        }
      }

      if (has_any_renamed) {
        if (!isDeletedInUndo(newname)) {
          undo_change['~' + newname] = oldname;
        }
      }
    }

    for (const [p, val] of Object.entries(parsed_change.overlay)) {
      // Note: use changed_props in order of possible renaming
      if (result.props.hasOwnProperty(p)) {
        const undo_p = renamed_keys.get(p) ?? p;
        undo_change[undo_p] = result.props[p];
      } else {
        if (!isDeletedInUndo(p)) {
          const parent_red = redirectParentProp(p);
          undo_change['~' + p] = parent_red.oldname === null ? null : true;
        }
      }
      result.props[p] = val;
    }

    result.undo.unshift(undo_change);
  }

  // Post-process arrays
  recalculatePropsArrayIndexes(result.props);

  return result;
}

export function recalculatePropsArrayIndexes(props: AssetProps) {
  for (const [arr_prop, arr_val] of Object.entries(props)) {
    if (Array.isArray(arr_val)) {
      const indices_set = new Set<number>();
      const index_regexp = new RegExp(
        '^' + escapeRegExp(arr_prop + '\\') + '(-?\\d+(\\.\\d+)?)',
      );

      for (const inner_prop of Object.keys(props)) {
        const match = inner_prop.match(index_regexp);
        if (
          match &&
          (match[0] === inner_prop || inner_prop[match[0].length] === '\\')
        ) {
          const index = parseFloat(match[1]);
          indices_set.add(index);
        }
      }
      const indices = [...indices_set];
      indices.sort((a, b) => a - b);
      props[arr_prop] = indices;
    }
  }
}

export function extractRemapParentProps(props: AssetProps): {
  normalProps: AssetProps;
  remapParentProps: Record<string, string | null> | null;
} {
  const computed_props: AssetProps = {};
  let remap_parent_props: Record<string, string | null> | null = null;
  for (const [key, value] of Object.entries(props)) {
    const key_del = key.match(DeletingKeyRegexp);
    if (key_del) {
      if (!remap_parent_props) remap_parent_props = {};
      remap_parent_props[key_del[1]] =
        value !== null ? castAssetPropValueToString(value) : null;
    } else {
      computed_props[key] = value;
    }
  }
  return {
    normalProps: computed_props,
    remapParentProps: remap_parent_props,
  };
}
