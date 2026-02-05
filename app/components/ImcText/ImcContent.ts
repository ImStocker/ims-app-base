import type { Op } from 'quill-delta';
import Delta from 'quill-delta';
import {
  type AssetPropValue,
  castAssetPropValueToText,
  convertAssetPropValueTextOpsToStr,
} from '../../logic/types/Props';
import type { ImcAssetBlotData } from './blots/ImcAssetBlot';

export function packQuillDeltaToPropValue(val: { ops: Op[] }): AssetPropValue {
  if (val.ops && val.ops.length === 2) {
    let plain_asset =
      val.ops[0].attributes &&
      !!val.ops[0].attributes.asset &&
      Object.keys(val.ops[0].attributes).length === 1 &&
      val.ops[0].insert ===
        (val.ops[0].attributes.asset as ImcAssetBlotData).value.Title;
    if (
      plain_asset &&
      val.ops[1].insert !== '\n' &&
      val.ops[1].insert !== ' \n'
    ) {
      plain_asset = false;
    }
    if (
      plain_asset &&
      val.ops[1].attributes &&
      Object.keys(val.ops[1].attributes).length > 0
    ) {
      plain_asset = false;
    }
    if (plain_asset && val.ops[0].attributes && val.ops[0].attributes.asset) {
      return (val.ops[0].attributes.asset as ImcAssetBlotData).value;
    }
  }

  const conv = convertAssetPropValueTextOpsToStr(val.ops);

  let res_value: AssetPropValue;
  if (conv.plain) {
    if (conv.str && conv.str[conv.str.length - 1] === '\n') {
      conv.str = conv.str.substring(0, conv.str.length - 1);
    }
    if (conv.str === '') {
      res_value = null;
    } else {
      const plain_as_int = /^-?\d+$/.test(conv.str) ? parseInt(conv.str) : null;
      if (
        plain_as_int !== null &&
        plain_as_int >= -Number.MAX_SAFE_INTEGER &&
        plain_as_int <= Number.MAX_SAFE_INTEGER
      ) {
        res_value = plain_as_int;
      } else {
        const plain_as_float = /^-?\d+\.\d{1,4}$/.test(conv.str)
          ? parseFloat(conv.str)
          : null;
        if (plain_as_float && plain_as_float.toString() === conv.str) {
          res_value = plain_as_float;
        } else {
          res_value = conv.str;
        }
      }
    }
  } else {
    res_value = {
      Ops: val.ops,
      Str: conv.str,
    };
  }
  return res_value;
}

export function unpackQuillDeltaFromPropValue(val: AssetPropValue): Delta {
  if (typeof val === 'string' && val) {
    val = val + '\n';
  }
  const text = castAssetPropValueToText(val);
  return new Delta(text.Ops);
}
