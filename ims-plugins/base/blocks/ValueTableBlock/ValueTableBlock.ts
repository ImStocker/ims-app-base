import {
  type AssetProps,
  type AssetPropValue,
  type AssetPropValueAsset,
  assignPlainValueToAssetProps,
  castAssetPropValueToBoolean,
  castAssetPropValueToFloat,
  castAssetPropValueToInt,
  castAssetPropValueToString,
  convertAssetPropsToPlainObject,
  isPropInherited,
} from '#logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '#logic/types/PropsForm';
import type { ResolvedAssetBlock } from '#logic/utils/assets';

export type ValueTableBlockColumn = PropsFormFieldDef & {
  name: string;
  width: number;
};

export type ValueTableBlockRowData = {
  id: string;
  primaryValue: number | string | null;
  index: number;
  asset: AssetPropValueAsset | null;
  columns: ValueTableBlockColumn[];
  inherited: boolean;
};

export type ValueTableBlockData = {
  columns: ValueTableBlockColumn[];
  primary: string | null;
  rows: ValueTableBlockRowData[];
  values: PropsFormState;
  usedRowIds: Set<string>;
};

export function extractValueTableBlockData(
  block: ResolvedAssetBlock,
): ValueTableBlockData {
  const changed_props = block.computed;
  const res: ValueTableBlockData = {
    columns: [],
    primary: null,
    rows: [],
    values: {
      combined: {},
      values: {},
    },
    usedRowIds: new Set(),
  };

  for (const [key, value] of Object.entries(
    changed_props as { [key: string]: any },
  )) {
    res.values.combined[key] = value;
    const prop_inherited = block.inherited
      ? isPropInherited(key, block.props, block.inherited)
      : false;
    const value_inherited = prop_inherited && block.props[key] === undefined;
    res.values.values[key] = {
      computedSame: true,
      computedState: true,
      computedValue: value,
      inherited: value_inherited,
      same: true,
      value: value,
    };
  }

  const plain = convertAssetPropsToPlainObject(changed_props);

  if (typeof plain.__columns === 'object' && plain.__columns) {
    for (const [key, column] of Object.entries(
      plain.__columns as { [key: string]: any },
    )) {
      const params: AssetProps = {};
      if (column.params) {
        assignPlainValueToAssetProps(params, column.params);
      }
      res.columns.push({
        name: key,
        propKey: `${key}`,
        propTitle: castAssetPropValueToString(column.title),
        index: castAssetPropValueToFloat(column.index) ?? 0,
        multiple: castAssetPropValueToBoolean(column.multiple),
        params,
        type: castAssetPropValueToString(column.type),
        hint: column.hint,
        differentDefinition: false,
        inheritedProp: block.inherited
          ? isPropInherited(
              `__columns\\${key}\\type`,
              block.props,
              block.inherited,
            )
          : false,
        width:
          (column.width ? castAssetPropValueToInt(column.width) : null) ?? 150,
        propName: '',
      });
    }
  }

  res.columns.sort((c1, c2) => c1.index - c2.index);
  if (plain.hasOwnProperty('__primary') && plain.__primary) {
    res.primary = castAssetPropValueToString(plain.__primary as AssetPropValue);
  }

  for (const [row_id, plain_row] of Object.entries(
    plain as { [key: string]: any },
  )) {
    if (/^__/.test(row_id)) {
      continue;
    }
    if (typeof plain_row !== 'object') {
      continue;
    }
    let inherited = false;
    const new_row_columns: ValueTableBlockColumn[] = [];
    for (const c of res.columns) {
      const c_key = `${row_id}\\values\\${c.propKey}`;
      inherited =
        inherited ||
        (res.values.values[c_key] && res.values.values[c_key].inherited);
      new_row_columns.push({
        ...c,
        propKey: c_key,
      });
    }
    const new_row: ValueTableBlockRowData = {
      id: row_id,
      asset: null,
      index: castAssetPropValueToFloat(plain_row.index) ?? 0,
      columns: new_row_columns,
      primaryValue:
        res.primary && plain_row.values ? plain_row.values[res.primary] : null,
      inherited,
    };

    res.usedRowIds.add(row_id);

    if (plain_row.asset) {
      new_row.asset = plain_row.asset;
    }
    if (typeof plain_row.values === 'object' && plain_row.values) {
      const raw_values: AssetProps = {};
      assignPlainValueToAssetProps(raw_values, plain_row.values);
    }

    res.rows.push(new_row);
  }

  res.rows.sort((r1, r2) => r1.index - r2.index);

  return res;
}
